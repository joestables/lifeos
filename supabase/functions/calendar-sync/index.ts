// calendar-sync: reads every calendar that is on (ADR-0047), woken every
// five minutes by core_private.calendar_tick through pg_net with a secret
// kept in Vault, which this function checks with the database
// (core.calendar_secret_ok). A broken connection is recorded by the
// database (core.calendar_broken); other failures are in the function's
// logs and its answer. Deployed by Claude through the Supabase MCP with
// packages/recurrence's files (runbook.md#google-calendar).
import { syncAll } from './run.ts'
import { client, rpc } from './supabase.ts'

Deno.serve(async (req) => {
  const secret = req.headers.get('x-calendar-secret')
  if (!secret || !(await rpc('calendar_secret_ok', { p_secret: secret })))
    return new Response('Forbidden', { status: 403 })
  const run = await syncAll(rpc, fetch, client)
  if (run.failed.length > 0) console.error('calendar-sync', JSON.stringify(run.failed))
  return Response.json(run)
})
