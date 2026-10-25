import type { AiRefusal, AiStatus, FillAnswer, ImportAnswer, MealAnswer } from '@lifeos/food'
import { useQuery } from '@tanstack/react-query'
import { queryClient } from './queryClient'
import { supabase } from './supabase'

/**
 * The AI service (ADR-0054): the `ai` Edge Function, as me. It needs a
 * connection; nothing it answers is kept until I keep it.
 */
async function ask<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase().functions.invoke('ai', { body })
  if (error) throw error
  return data as T
}

/**
 * Why a call failed, as the app can tell: no signal; a long wait cut off
 * (the function's time limit, 504 or 546, or the connection dropped after
 * it); or anything else.
 */
function refusal(e: unknown, started: number): AiRefusal {
  if (!navigator.onLine) return 'unreachable'
  const status = (e as { context?: { status?: number } }).context?.status
  if (status === 504 || status === 546 || Date.now() - started > 60_000) return 'slow'
  return 'failed'
}

export const aiStatusKey = ['ai', 'status'] as const

/** Whether the AI can be used now, asked when a feature is about to be offered. */
export function useAiStatus(enabled: boolean): AiStatus | undefined {
  const { data } = useQuery({
    queryKey: aiStatusKey,
    queryFn: async (): Promise<AiStatus> => {
      if (!navigator.onLine) return { available: false, reason: 'unreachable' }
      return ask<AiStatus>({ task: 'status' }).catch(() => ({
        available: false,
        reason: 'unreachable',
      }))
    },
    enabled,
    staleTime: 60_000,
    retry: false,
  })
  return data
}

/** `recipe.import` (RCP-014): a link written up as recipes to check. */
export async function importRecipe(link: string): Promise<ImportAnswer> {
  if (!navigator.onLine) return { ok: false, reason: 'unreachable' }
  const started = Date.now()
  const answer = await ask<ImportAnswer>({ task: 'recipe.import', link }).catch(
    (e): ImportAnswer => ({ ok: false, reason: refusal(e, started) }),
  )
  void queryClient.invalidateQueries({ queryKey: aiStatusKey })
  return answer
}

/** `recipe.fill_lines` (RCP-007 5): the lines a method uses. Only the method is sent. */
export async function fillFromMethod(steps: string[]): Promise<FillAnswer> {
  if (!navigator.onLine) return { ok: false, reason: 'unreachable' }
  const started = Date.now()
  const answer = await ask<FillAnswer>({ task: 'recipe.fill_lines', steps }).catch(
    (e): FillAnswer => ({ ok: false, reason: refusal(e, started) }),
  )
  void queryClient.invalidateQueries({ queryKey: aiStatusKey })
  return answer
}

/** `meal.ingredients` (MPL-006 2): a link's ingredients and servings for a typed Meal. */
export async function mealIngredients(link: string): Promise<MealAnswer> {
  if (!navigator.onLine) return { ok: false, reason: 'unreachable' }
  const started = Date.now()
  const answer = await ask<MealAnswer>({ task: 'meal.ingredients', link }).catch(
    (e): MealAnswer => ({ ok: false, reason: refusal(e, started) }),
  )
  void queryClient.invalidateQueries({ queryKey: aiStatusKey })
  return answer
}

/**
 * A link's name and picture, the picture as a data URL (MPL-006 6, RCP-003
 * 1), from `link-preview`: not AI, nothing counted. Null when it can't be
 * asked (offline, unreachable); empty when the page has neither.
 */
export async function linkPreview(
  link: string,
): Promise<{ name: string | null; photo: string | null } | null> {
  if (!navigator.onLine) return null
  const { data, error } = await supabase()
    .functions.invoke('link-preview', { body: { link } })
    .catch(() => ({ data: null, error: true }))
  if (error) return null
  const found = data as { name?: string | null; photo?: string | null } | null
  return { name: found?.name ?? null, photo: found?.photo ?? null }
}

/** A link's picture alone (MPL-006 6). */
export const linkPicture = async (link: string) => (await linkPreview(link))?.photo ?? null

/** What `food.keep_import` takes (RCP-014 3). */
export interface KeptImport {
  name: string
  category: string
  cuisine: string
  protein: string[]
  carbs: string[]
  servings: number | null
  prep_min: number | null
  cook_min: number | null
  notes: string
  sources: string[]
  steps: { position: string; text: string }[]
  lines: {
    position: string
    heading?: string
    pantry_id?: string
    new_pantry?: { id: string; name: string; aisle: string; default_unit: string | null }
    text?: string
    qty?: number | null
    qty_max?: number | null
    approx?: boolean
    unit?: string | null
  }[]
}

/**
 * Keeps an import, all of it together (RCP-014 3), as a new Draft or into
 * my Idea `recipe` (RCP-014 4). Straight to the server, not queued: the
 * import needed a connection a moment ago, and a half-kept recipe would be
 * worse than one I'm told wasn't kept.
 */
export async function keepImport(recipe: string, variation: string, draft: KeptImport) {
  const { error } = await supabase()
    .schema('food')
    .rpc('keep_import', {
      p_recipe: recipe,
      p_variation: variation,
      p_draft: draft as never,
    })
  if (error) throw error
  await queryClient.invalidateQueries()
}
