// calendar-callback: where Google sends me back after I allow LifeOS into
// my calendars (GCL-001). Not signed in (Google's redirect carries no app
// token), so it connects no one itself: it keeps the refresh token in Vault
// against the one-time state the app's start made (core.calendar_received)
// and sends me back to Settings with a finish code, which the app, signed in
// as me, hands to calendar-connect to finish (only the person who began
// can). Deployed by Claude through the Supabase MCP with calendar-sync's
// files and packages/recurrence's.
import { accountOf, allowedReturn } from '../calendar-sync/run.ts'
import { client, redirectUri, rpc } from '../calendar-sync/supabase.ts'

const FALLBACK = 'https://joestables.uk/settings'
const back = (to: string, outcome: string) =>
  Response.redirect(`${to}${to.includes('?') ? '&' : '?'}calendar=${outcome}`, 302)

Deno.serve(async (req) => {
  const params = new URL(req.url).searchParams
  const code = params.get('code')
  const state = params.get('state')
  if (!code || !state) return back(FALLBACK, 'cancelled')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: client.id,
      client_secret: client.secret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  const tokens = (await res.json().catch(() => ({}))) as Record<string, string>
  if (!res.ok || !tokens.refresh_token || !tokens.access_token) {
    console.error('calendar-callback: token', res.status, tokens.error)
    return back(FALLBACK, 'failed')
  }

  let done: { finish: string; return_to: string }
  try {
    done = (await rpc('calendar_received', {
      p_state: state,
      p_account: accountOf(tokens.id_token),
      p_refresh_token: tokens.refresh_token,
    })) as typeof done
  } catch (e) {
    console.error('calendar-callback: state', String(e))
    return back(FALLBACK, 'expired')
  }
  // Only back to the app's own addresses, whatever the state was made with.
  const to = allowedReturn(done.return_to) ? done.return_to : FALLBACK
  return back(to, `finish&code=${encodeURIComponent(done.finish)}`)
})
