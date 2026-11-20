import type { Database } from './database.types'
import type { QueueEntry } from './queue/store'
import { supabase } from './supabase'
import { allRows } from './paging'

type Shop = Database['shopping']['Tables']

/**
 * A line on a food shop (SHP-001): a Meal's (meal_id, written by the
 * database; ADR-0057), or one added by hand.
 */
export type ShopLine = Omit<Shop['lines']['Row'], 'created_at' | 'updated_at'>
/** A Meal on a food shop (SHP-002). */
export type ListMeal = Pick<Shop['list_meals']['Row'], 'list_id' | 'meal_id'>
/** A food shop's Meal as its readers see it (shopping.meals_of): its name, day, slot. */
export interface ShopMeal {
  meal_id: string
  title: string
  do_on: string | null
  slot: string | null
  servings: number | null
  personal: boolean
  live: boolean
}
/** What a line is added with (SHP-003 1, SHP-001 3). */
export type ShopLineFields = Partial<
  Pick<
    ShopLine,
    | 'position'
    | 'heading'
    | 'pantry_id'
    | 'text'
    | 'qty'
    | 'qty_max'
    | 'approx'
    | 'unit'
    | 'needed_space_id'
  >
>
/** What a new food shop is made with (SHP-001 2, SHP-002 1). */
export interface ListFields {
  title: string
  do_on?: string | null
  space_id?: string
  meals?: string[]
}

export const shopLinesKey = ['shopping', 'lines'] as const
export const listMealsKey = ['shopping', 'list_meals'] as const
export const shopMealsKey = (list: string) => ['shopping', 'meals_of', list] as const

const shopping = () => supabase().schema('shopping')

export async function fetchShopLines(): Promise<ShopLine[]> {
  return allRows((from, to) =>
    shopping()
      .from('lines')
      .select(
        'id, list_id, position, heading, pantry_id, text, qty, qty_max, approx, unit, checked, meal_id, source_id, needed_space_id',
      )
      .order('position')
      .order('id')
      .range(from, to),
  )
}

export async function fetchListMeals(): Promise<ListMeal[]> {
  return allRows((from, to) =>
    shopping()
      .from('list_meals')
      .select('list_id, meal_id')
      .order('list_id')
      .order('meal_id')
      .range(from, to),
  )
}

export async function fetchShopMeals(list: string): Promise<ShopMeal[]> {
  const { data, error } = await shopping().rpc('meals_of', { p_list: list })
  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// Unsent writes laid over what the server last sent (OFF-001).

type Args = Record<string, unknown>
const args = (e: QueueEntry) => e.args as Args
const trimmed = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)

export function applyPendingListMeals(
  rows: readonly ListMeal[],
  entries: readonly QueueEntry[],
): ListMeal[] {
  let out = [...rows]
  const add = (list: string, meal: string) => {
    if (!out.some((r) => r.list_id === list && r.meal_id === meal))
      out.push({ list_id: list, meal_id: meal })
  }
  for (const e of entries) {
    const a = args(e)
    if (e.fn === 'shopping.create_list') {
      const f = (a.p_fields ?? {}) as Args
      for (const m of (f.meals as string[] | undefined) ?? []) add(String(a.p_id), m)
    } else if (e.fn === 'shopping.add_meals') {
      for (const m of (a.p_meals as string[] | undefined) ?? []) add(String(a.p_list), m)
    } else if (e.fn === 'shopping.remove_meal') {
      out = out.filter((r) => !(r.list_id === a.p_list && r.meal_id === a.p_meal))
    }
  }
  return out
}

const byPosition = <T extends { position: string; id: string }>(a: T, b: T) =>
  a.position < b.position ? -1 : a.position > b.position ? 1 : a.id < b.id ? -1 : 1

/** Lines with unsent additions, changes, ticks and deletions laid over. */
export function applyPendingShopLines(
  rows: readonly ShopLine[],
  entries: readonly QueueEntry[],
): ShopLine[] {
  let out = [...rows]
  for (const e of entries) {
    const a = args(e)
    switch (e.fn) {
      case 'shopping.add_line': {
        if (out.some((l) => l.id === a.p_id)) break
        const f = (a.p_fields ?? {}) as Args
        out.push({
          id: String(a.p_id),
          list_id: String(a.p_list),
          position: String(f.position ?? ''),
          heading: trimmed(f.heading),
          pantry_id: (f.pantry_id as string) ?? null,
          text: trimmed(f.text),
          qty: (f.qty as number) ?? null,
          qty_max: (f.qty_max as number) ?? null,
          approx: Boolean(f.approx),
          unit: (f.unit as string) ?? null,
          checked: false,
          meal_id: null,
          source_id: null,
          needed_space_id: (f.needed_space_id as string) ?? null,
        })
        break
      }
      case 'shopping.update_line': {
        const p = (a.p_patch ?? {}) as Args
        out = out.map((l) =>
          l.id !== a.p_id || l.meal_id
            ? l
            : {
                ...l,
                ...('position' in p && { position: String(p.position) }),
                ...('heading' in p && { heading: trimmed(p.heading) }),
                ...('pantry_id' in p && { pantry_id: (p.pantry_id as string) ?? null }),
                ...('text' in p && { text: trimmed(p.text) }),
                ...('qty' in p && { qty: (p.qty as number) ?? null }),
                ...('qty_max' in p && { qty_max: (p.qty_max as number) ?? null }),
                ...('approx' in p && { approx: Boolean(p.approx) }),
                ...('unit' in p && { unit: (p.unit as string) ?? null }),
              },
        )
        break
      }
      case 'shopping.delete_line':
        out = out.filter((l) => l.id !== a.p_id || l.meal_id !== null)
        break
      case 'shopping.tick': {
        const ids = new Set((a.p_ids as string[] | undefined) ?? [])
        out = out.map((l) =>
          ids.has(l.id) && l.heading === null ? { ...l, checked: Boolean(a.p_checked) } : l,
        )
        break
      }
      case 'shopping.remove_meal':
        out = out.filter((l) => !(l.list_id === a.p_list && l.meal_id === a.p_meal && !l.checked))
        break
      case 'food.merge_pantry':
        out = out.map((l) =>
          l.pantry_id === a.p_merge ? { ...l, pantry_id: String(a.p_keep) } : l,
        )
        break
    }
  }
  return out.sort(byPosition)
}
