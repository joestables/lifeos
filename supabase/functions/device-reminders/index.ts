// device-reminders: the Android app's Reminders from 12 hours ago to a week
// ahead, each with what its notification says, for the phone to set itself
// (REM-010, ADR-0063). The phone proves itself with its device's secret,
// checked by the database (core.device_reminders). Deployed by Claude
// through the Supabase MCP without JWT checks (runbook.md#notifications).
import { firings, type Rpc } from './run.ts'

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
  if (!res.ok) {
    const error = Object.assign(new Error(`${fn}: ${res.status}`), { status: res.status })
    throw error
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Not found', { status: 404 })
  try {
    const answer = await firings(rpc, await req.json().catch(() => ({})))
    return answer ? Response.json(answer) : new Response('Forbidden', { status: 403 })
  } catch (e) {
    const status = (e as { status?: number }).status
    // The database refuses a wrong secret (42501), which PostgREST answers 401 or 403.
    if (status === 401 || status === 403) return new Response('Forbidden', { status: 403 })
    console.error('device-reminders', String(e))
    return new Response('Failed', { status: 500 })
  }
})
