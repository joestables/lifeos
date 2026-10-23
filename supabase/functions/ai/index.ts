// ai: the AI service (ADR-0054), as the person signed in. Gemini's free tier
// only; the key is this function's secret. Its tasks: `status` (can the AI
// be used, and how much of today's allowance is left), `recipe.import`
// (RCP-014), `recipe.fill_lines` (RCP-007 5) and `meal.ingredients`
// (MPL-006 2). Each use is counted
// against a daily allowance per person (AI_DAILY_ALLOWANCE, 30 to start),
// and AI_OFF=1 turns it off. The models are configuration: AI_MODEL, then
// AI_FALLBACK_MODEL. Deployed by Claude through the Supabase MCP with
// rules.ts, schema.ts, run.ts and packages/food's files.
import type { AiStatus } from '../../../packages/food/src/imported.ts'
import {
  fillLines,
  importRecipe,
  mealIngredients,
  Refused,
  type Gemini,
  type ImportDeps,
} from './run.ts'
import type { PantryEntry } from './schema.ts'

const url = Deno.env.get('SUPABASE_URL')!
// The project's secret key: the new kind if it has one, else the service role.
const secret =
  Object.values(
    JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>,
  )[0] ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const anon =
  Object.values(
    JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}') as Record<string, string>,
  )[0] ?? Deno.env.get('SUPABASE_ANON_KEY')!

const gemini: Gemini = {
  key: Deno.env.get('GEMINI_API_KEY') ?? '',
  models: [
    Deno.env.get('AI_MODEL') || 'gemini-flash-latest',
    Deno.env.get('AI_FALLBACK_MODEL') || 'gemini-flash-lite-latest',
  ],
}
const allowance = Number(Deno.env.get('AI_DAILY_ALLOWANCE') ?? '') || 30
const off = Deno.env.get('AI_OFF') === '1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const answer = (body: unknown, status = 200) => Response.json(body, { status, headers: cors })

const call = async (path: string, init: RequestInit, profile = 'core') => {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...init.headers,
      'Content-Type': 'application/json',
      'Content-Profile': profile,
      'Accept-Profile': profile,
    },
  })
  if (!res.ok) throw new Error(`${path}: ${res.status} ${(await res.text()).slice(0, 300)}`)
  const text = await res.text()
  return text ? JSON.parse(text) : null
}
/** A core function as the service role. */
const rpc = (fn: string, args: Record<string, unknown>) =>
  call(`rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: secret,
      ...(secret.startsWith('sb_') ? {} : { Authorization: `Bearer ${secret}` }),
    },
    body: JSON.stringify(args),
  })

/** Who the token is, checked by Auth. */
async function personOf(token: string): Promise<string | null> {
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anon, Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return ((await res.json()) as { id?: string }).id ?? null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '')
  const me = token ? await personOf(token) : null
  if (!token || !me) return answer({ error: 'Not signed in' }, 401)
  const { task, link, steps } = (await req.json().catch(() => ({}))) as {
    task?: string
    link?: string
    steps?: unknown
  }

  if (task === 'status') {
    if (off || !gemini.key) return answer({ available: false, reason: 'off' } satisfies AiStatus)
    const left = (await rpc('ai_left', { p_person: me, p_allowance: allowance })) as number
    return answer(
      (left > 0
        ? { available: true, left }
        : { available: false, reason: 'allowance' }) satisfies AiStatus,
    )
  }

  if (task === 'recipe.import' || task === 'recipe.fill_lines' || task === 'meal.ingredients') {
    if (off || !gemini.key) return answer({ ok: false, reason: 'off' })
    if (task !== 'recipe.fill_lines' && typeof link !== 'string')
      return answer({ ok: false, reason: 'bad_link' })
    const asMe = { apikey: anon, Authorization: `Bearer ${token}` }
    try {
      const deps: ImportDeps = {
        fetch,
        gemini,
        vocabulary: async () => {
          const [pantry, values] = (await Promise.all([
            call('pantry?select=id,name&kind=eq.ingredient&order=name', { headers: asMe }, 'food'),
            call(
              `values?select=kind,name&person_id=eq.${me}&order=name`,
              { headers: asMe },
              'food',
            ),
          ])) as [PantryEntry[], { kind: string; name: string }[]]
          const of = (kind: string) => values.filter((v) => v.kind === kind).map((v) => v.name)
          return {
            pantry,
            lists: {
              categories: of('category'),
              cuisines: of('cuisine'),
              proteins: of('protein'),
              carbs: of('carb'),
            },
          }
        },
        take: async (name, details) => {
          const taken = (await rpc('ai_take', {
            p_person: me,
            p_allowance: allowance,
            p_task: name,
            p_details: details,
          })) as boolean
          return taken
            ? ((await rpc('ai_left', { p_person: me, p_allowance: allowance })) as number)
            : null
        },
      }
      return answer(
        task === 'recipe.import'
          ? await importRecipe(deps, link!)
          : task === 'meal.ingredients'
            ? await mealIngredients(deps, link!)
            : await fillLines(deps, steps),
      )
    } catch (e) {
      if (e instanceof Refused) return answer({ ok: false, reason: e.reason })
      const message = String(e).slice(0, 500)
      console.error('ai', message)
      await rpc('ai_failed', { p_person: me, p_task: task, p_message: message }).catch(() => {})
      return answer({ ok: false, reason: 'failed' })
    }
  }
  return answer({ error: 'Unknown task' }, 400)
})
