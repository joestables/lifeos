// extend-series: the nightly series run (ADR-0045), called by pg_cron at
// 02:00 UTC through pg_net with a secret kept in Vault, which this function
// checks with the database (core.series_secret_ok). Deployed by Claude through the Supabase MCP with
// packages/recurrence's files (runbook.md#the-nightly-series-run).
import { extendAll, type Rpc } from './run.ts'

const url = Deno.env.get('SUPABASE_URL')!
// The project's secret key: the new kind if it has one, else the service role.
const key =
  Object.values(
    JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>,
  )[0] ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const rpc: Rpc = async (fn, args) => {
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: key,
      // A new secret key isn't a JWT; the gateway makes one for it.
      ...(key.startsWith('sb_') ? {} : { Authorization: `Bearer ${key}` }),
      'Content-Type': 'application/json',
      'Content-Profile': 'core',
      'Accept-Profile': 'core',
    },
    body: JSON.stringify(args),
  })
  if (!res.ok) throw new Error(`${fn}: ${res.status} ${(await res.text()).slice(0, 300)}`)
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

Deno.serve(async (req) => {
  const secret = req.headers.get('Authorization')?.replace(/^Bearer /, '')
  if (!secret || !(await rpc('series_secret_ok', { p_secret: secret })))
    return new Response('Forbidden', { status: 403 })
  try {
    return Response.json(await extendAll(rpc))
  } catch (e) {
    // Recorded, so the morning health check sees it (runbook.md#noticing-problems).
    await rpc('finish_series_run', {
      p_ok: false,
      p_details: { message: String(e).slice(0, 500) },
    }).catch(() => {})
    return Response.json({ error: String(e) }, { status: 500 })
  }
})
