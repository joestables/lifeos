// calendar-callback: where Google sends me back after I allow LifeOS into
// my calendars (GCL-001). Not signed in (Google's redirect carries no app
// token), so it trusts only the one-time state the app's start made
// (core.calendar_connected). It keeps the refresh token in Vault, lists my
// calendars, reads them once, and sends me back to Settings. Deployed by
// Claude through the Supabase MCP with calendar-sync's files and
// packages/recurrence's.
import { accountOf, google, syncAll } from '../calendar-sync/run.ts'
import { client, redirectUri, rpc } from '../calendar-sync/supabase.ts'

const FALLBACK = 'https://lifeos-bice-mu.vercel.app/settings'
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

  let done: { connection: string; return_to: string }
  try {
    done = (await rpc('calendar_connected', {
      p_state: state,
      p_account: accountOf(tokens.id_token),
      p_refresh_token: tokens.refresh_token,
    })) as typeof done
  } catch (e) {
    console.error('calendar-callback: state', String(e))
    return back(FALLBACK, 'expired')
  }

  try {
    const calendars = await google(fetch, tokens.access_token).calendars()
    await rpc('calendar_set_calendars', { p_connection: done.connection, p_calendars: calendars })
    await syncAll(rpc, fetch, client, { connection: done.connection })
  } catch (e) {
    // Connected all the same; the five-minute sync carries on.
    console.error('calendar-callback: first sync', String(e))
  }
  return back(done.return_to, 'connected')
})
