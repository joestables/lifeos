// calendar-connect: what the app asks of Google Calendar, as the person
// signed in. Their token goes with every database call, so the database
// checks it (the gateway doesn't, or it would refuse the browser's CORS
// preflight). Start connecting
// (GCL-001), finish it with the code Google's callback sent me back with
// (only the person who began can), disconnect (GCL-001 3), or sync now when
// Plan opens (ADR-0047, at most once a minute). Deployed by Claude through the Supabase MCP with
// calendar-sync's files and packages/recurrence's.
import { allowedReturn, consentUrl, syncAll } from '../calendar-sync/run.ts'
import { asPerson, client, redirectUri, rpc } from '../calendar-sync/supabase.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const answer = (body: unknown, status = 200) => Response.json(body, { status, headers: cors })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    return await handle(req)
  } catch (e) {
    // A token the database refuses is a sign-in that has run out.
    const message = String(e)
    console.error('calendar-connect', message.slice(0, 300))
    return answer({ error: 'Failed' }, /: 401 /.test(message) ? 401 : 500)
  }
})

async function handle(req: Request): Promise<Response> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '')
  if (!token) return answer({ error: 'Not signed in' }, 401)
  const me = asPerson(token)
  const { action, returnTo, code } = (await req.json().catch(() => ({}))) as {
    action?: string
    returnTo?: string
    code?: string
  }

  if (action === 'start') {
    if (!returnTo || !allowedReturn(returnTo)) return answer({ error: 'Unknown app address' }, 400)
    if (!client.id) return answer({ error: 'Google Calendar isn’t set up' }, 503)
    const state = (await me.rpc('calendar_begin', { p_return_to: returnTo })) as string
    return answer({ url: consentUrl(client.id, redirectUri, state) })
  }

  if (action === 'finish') {
    if (!code) return answer({ error: 'No code' }, 400)
    let connection: string
    try {
      connection = (await me.rpc('calendar_finish', { p_code: code })) as string
    } catch {
      return answer({ error: 'Expired' }, 410)
    }
    // Its calendars listed and read once; the five-minute sync carries on if not.
    await syncAll(rpc, fetch, client, { connection }).catch((e) =>
      console.error('calendar-connect: first sync', String(e)),
    )
    return answer({ connected: true })
  }

  // My connection, as I can see it.
  const [conn] = ((await me.select(
    'connections?select=id,last_synced_at,disconnected_at&provider=eq.google_calendar',
  )) ?? []) as { id: string; last_synced_at: string | null; disconnected_at: string | null }[]
  if (!conn || conn.disconnected_at) return answer({ connected: false })

  if (action === 'disconnect') {
    const refresh = (await rpc('calendar_token', { p_connection: conn.id })) as string | null
    if (refresh)
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refresh)}`, {
        method: 'POST',
      }).catch(() => {})
    await rpc('calendar_disconnected', { p_connection: conn.id })
    return answer({ connected: false })
  }

  if (action === 'sync') {
    const last = conn.last_synced_at ? Date.parse(conn.last_synced_at) : 0
    if (Date.now() - last < 60_000) return answer({ skipped: true })
    return answer(await syncAll(rpc, fetch, client, { connection: conn.id }))
  }
  return answer({ error: 'Unknown action' }, 400)
}
