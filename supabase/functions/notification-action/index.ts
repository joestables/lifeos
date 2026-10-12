// notification-action: Done and Snooze from a notification (REM-005,
// ADR-0044), called by the service worker with the delivery's id and token.
// Deployed by Claude through the Supabase MCP with packages/recurrence's
// files (runbook.md#notifications).
import { act, type Rpc } from './run.ts'

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

// The service worker calls from the app's origin.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const ok = await act(rpc, await req.json())
    return Response.json({ ok }, { status: ok ? 200 : 400, headers: CORS })
  } catch (e) {
    console.error('notification-action', String(e))
    return Response.json({ ok: false }, { status: 500, headers: CORS })
  }
})
