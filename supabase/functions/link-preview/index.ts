// link-preview: a link's picture, as the person signed in (ADR-0054): not
// AI, so not counted against the allowance. For a typed Meal's link
// (MPL-006 6). Deployed by Claude through the Supabase MCP with the ai
// function's run.ts, rules.ts and schema.ts and packages/food's files.
import { linkPicture } from '../ai/run.ts'

const url = Deno.env.get('SUPABASE_URL')!
const anon =
  Object.values(
    JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}') as Record<string, string>,
  )[0] ?? Deno.env.get('SUPABASE_ANON_KEY')!

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const answer = (body: unknown, status = 200) => Response.json(body, { status, headers: cors })

/** Whether the token is someone's, checked by Auth. */
async function signedIn(token: string): Promise<boolean> {
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anon, Authorization: `Bearer ${token}` },
  })
  return res.ok
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '')
  if (!token || !(await signedIn(token))) return answer({ error: 'Not signed in' }, 401)
  const { link } = (await req.json().catch(() => ({}))) as { link?: unknown }
  if (typeof link !== 'string') return answer({ photo: null })
  return answer({ photo: await linkPicture(fetch, link) })
})
