// calendar-push: sends my Events to Google on the calendars that go both
// ways (GCL-005, ADR-0048), woken each minute by
// core_private.calendar_push_tick through pg_net while something waits,
// with the secret kept in Vault, which this function checks with the
// database (core.calendar_secret_ok). Deployed by Claude through the
// Supabase MCP with calendar-sync's files and packages/recurrence's.
import { client, rpc } from '../calendar-sync/supabase.ts'
import { pushAll } from './run.ts'

Deno.serve(async (req) => {
  const secret = req.headers.get('x-calendar-secret')
  if (!secret || !(await rpc('calendar_secret_ok', { p_secret: secret })))
    return new Response('Forbidden', { status: 403 })
  const run = await pushAll(rpc, fetch, client)
  if (run.failed > 0) console.error('calendar-push', JSON.stringify(run))
  return Response.json(run)
})
