// The project's database, from an Edge Function: as the service role, or
// as the person whose token the app sent.
import type { Rpc } from './run.ts'

export const url = Deno.env.get('SUPABASE_URL')!
// The project's secret key: the new kind if it has one, else the service role.
const key =
  Object.values(
    JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>,
  )[0] ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const anon =
  Object.values(
    JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}') as Record<string, string>,
  )[0] ?? Deno.env.get('SUPABASE_ANON_KEY')!

export const client = {
  id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
  secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
}
export const redirectUri = `${url}/functions/v1/calendar-callback`

const call = async (path: string, init: RequestInit) => {
  const res = await fetch(`${url}/rest/v1/${path}`, init)
  if (!res.ok) throw new Error(`${path}: ${res.status} ${(await res.text()).slice(0, 300)}`)
  const text = await res.text()
  return text ? JSON.parse(text) : null
}
const headers = (apikey: string, bearer?: string) => ({
  apikey,
  // A new secret key isn't a JWT; the gateway makes one for it.
  ...(bearer && !bearer.startsWith('sb_') ? { Authorization: `Bearer ${bearer}` } : {}),
  'Content-Type': 'application/json',
  'Content-Profile': 'core',
  'Accept-Profile': 'core',
})

/** A core function as the service role. */
export const rpc: Rpc = (fn, args) =>
  call(`rpc/${fn}`, { method: 'POST', headers: headers(key, key), body: JSON.stringify(args) })

/** As the person signed in to the app: their token, so RLS and auth.uid() apply. */
export function asPerson(token: string) {
  return {
    rpc: (fn: string, args: Record<string, unknown>) =>
      call(`rpc/${fn}`, {
        method: 'POST',
        headers: headers(anon, token),
        body: JSON.stringify(args),
      }),
    select: (path: string) => call(path, { headers: headers(anon, token) }),
  }
}
