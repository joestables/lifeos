import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  applyPendingEntries,
  applyPendingLines,
  applyPendingMealLines,
  applyPendingMeals,
  applyPendingVariations,
  fetchLines,
  fetchMealLines,
  fetchMeals,
  fetchSpaceEntries,
  fetchVariations,
  linesKey,
  mealLinesKey,
  mealsKey,
  spaceEntriesKey,
  variationsKey,
  type SpaceEntry,
} from './food'
import { useItems, useLinks, useQueueEntries } from './hooks'
import type { QueueEntry } from './queue/store'
import type { WriteQueue } from './queue/queue'
import {
  applyPendingListMeals,
  applyPendingLists,
  applyPendingShopLines,
  fetchListMeals,
  fetchLists,
  fetchShopLines,
  fetchShopMeals,
  listMealsKey,
  listsKey,
  shopLinesKey,
  shopMealsKey,
  type ShopLine,
  type ShopMeal,
} from './shopping'
import type { Item } from './types'

/**
 * A list's line. `auto`: not stored, but one of its Space's out-of-stock
 * staples or Required Essentials, on every open food shop of that Space
 * until it is ticked (then a stored line, ticked) or unmarked (Joe, 25
 * October). Its id is `autoLineId`'s.
 */
export type ListLine = ShopLine & { auto?: 'staple' | 'essential' }

/** An open shop's line for a needed entry, until it is stored. */
export const autoLineId = (list: string, pantry: string) => `auto:${list}:${pantry}`

/** A Shopping list as the pages show it (SHP-001): its Item, kind, Meals and lines. */
export interface ShoppingList {
  item: Item
  kind: 'food' | 'list'
  /** A food shop's Meals (SHP-002). */
  meals: string[]
  lines: ListLine[]
  /**
   * The lines to tick: not its subheadings, nor the staples of its Space a
   * Meal needs, which are checked on Extra instead (SHP-003 3).
   */
  toBuy: ListLine[]
}

export interface ShoppingData {
  lists: ShoppingList[]
  byId: ReadonlyMap<string, ShoppingList>
  /** Which open food shop each Meal is on (SHP-002 4). */
  shopOf: ReadonlyMap<string, string>
  /** My Spaces' staples and Essentials, unsent changes and ticks laid over (SHP-005). */
  entries: SpaceEntry[]
  isLoading: boolean
}

const open = (i: Item) => i.status === 'active' && i.archived_at === null

/**
 * Every Shopping list I can see, with unsent writes laid over (OFF-001). A
 * Meal just added with no signal shows lines worked out here, scaled as the
 * database scales them, until the server's arrive (ADR-0057).
 */
export function useShopping(queue: WriteQueue): ShoppingData {
  const queued = useQueueEntries(queue)
  const { items, isLoading } = useItems(queue)
  const links = useLinks(queue)
  const lists = useQuery({ queryKey: listsKey, queryFn: fetchLists })
  const lines = useQuery({ queryKey: shopLinesKey, queryFn: fetchShopLines })
  const listMeals = useQuery({ queryKey: listMealsKey, queryFn: fetchListMeals })
  const entries = useQuery({ queryKey: spaceEntriesKey, queryFn: fetchSpaceEntries })
  const variationLines = useQuery({ queryKey: linesKey, queryFn: fetchLines })
  const variations = useQuery({ queryKey: variationsKey, queryFn: fetchVariations })
  const meals = useQuery({ queryKey: mealsKey, queryFn: fetchMeals })
  const mealLines = useQuery({ queryKey: mealLinesKey, queryFn: fetchMealLines })

  return useMemo(() => {
    const kinds = new Map(applyPendingLists(lists.data ?? [], queued).map((l) => [l.item_id, l]))
    const onList = applyPendingListMeals(listMeals.data ?? [], queued)
    let shopLines = applyPendingShopLines(lines.data ?? [], queued)

    // Lines for a Meal the server hasn't yet written onto its shop.
    const sent = new Set(shopLines.filter((l) => l.meal_id).map((l) => `${l.list_id}:${l.meal_id}`))
    const unsentMeals = onList.filter((m) => !sent.has(`${m.list_id}:${m.meal_id}`))
    if (unsentMeals.length) {
      const vLines = applyPendingLines(variationLines.data ?? [], queued)
      const vFields = new Map(
        applyPendingVariations(variations.data ?? [], queued).map((v) => [v.item_id, v]),
      )
      const mealRows = new Map(
        applyPendingMeals(meals.data ?? [], queued).map((m) => [m.item_id, m]),
      )
      const own = applyPendingMealLines(mealLines.data ?? [], queued)
      for (const { list_id, meal_id } of unsentMeals) {
        const meal = mealRows.get(meal_id)
        if (!meal || meal.leftovers_of) continue
        const variation = links.find(
          (l) => l.from_item === meal_id && l.link_type === 'uses',
        )?.to_item
        const v = variation ? vFields.get(variation) : undefined
        const factor = meal.servings && v?.servings ? meal.servings / v.servings : 1
        const base = { list_id, checked: false, meal_id, needed_space_id: null, heading: null }
        for (const l of vLines)
          if (l.variation_id === variation && !l.heading && (l.pantry_id || l.text))
            shopLines.push({
              ...base,
              id: `${list_id}:${l.id}`,
              source_id: l.id,
              position: l.position,
              pantry_id: l.pantry_id,
              text: l.text,
              qty: l.qty === null ? null : l.qty * factor,
              qty_max: l.qty_max === null ? null : l.qty_max * factor,
              approx: l.approx,
              unit: l.unit,
            })
        for (const l of own)
          if (l.meal_id === meal_id)
            shopLines.push({ ...base, ...l, id: `${list_id}:${l.id}`, source_id: l.id })
      }
      shopLines = [...shopLines]
    }

    const linesBy = new Map<string, ShopLine[]>()
    for (const l of shopLines) linesBy.set(l.list_id, [...(linesBy.get(l.list_id) ?? []), l])
    const mealsBy = new Map<string, string[]>()
    for (const m of onList) mealsBy.set(m.list_id, [...(mealsBy.get(m.list_id) ?? []), m.meal_id])

    // A tick clears needed where the line came from, else in the shop's own Space.
    const lineById = new Map(shopLines.map((l) => [l.id, l]))
    const itemById = new Map(items.map((i) => [i.id, i]))
    const ticked = (e: QueueEntry) =>
      ((e.args as { p_ids?: string[] }).p_ids ?? []).flatMap((id) => {
        const l = lineById.get(id)
        const space = l && (l.needed_space_id ?? itemById.get(l.list_id)?.space_id)
        return l?.pantry_id && space ? [{ space_id: space, pantry_id: l.pantry_id }] : []
      })
    const kept = applyPendingEntries(entries.data ?? [], queued, ticked)
    const staples = new Set(
      kept.filter((e) => e.kind === 'staple').map((e) => `${e.space_id}:${e.pantry_id}`),
    )

    const out: ShoppingList[] = items
      .filter((i) => i.type === 'shopping_list')
      .map((item) => {
        const stored = linesBy.get(item.id) ?? []
        const kind = kinds.get(item.id)?.kind === 'list' ? 'list' : 'food'
        // Its Space's needed staples and Essentials, on an open food shop
        // without a line of its own for them (SHP-003 3).
        const own = new Set(
          stored.filter((l) => l.meal_id === null && l.pantry_id).map((l) => l.pantry_id),
        )
        const auto: ListLine[] =
          kind === 'food' && open(item)
            ? kept
                .filter((e) => e.space_id === item.space_id && e.needed && !own.has(e.pantry_id))
                .map((e) => ({
                  id: autoLineId(item.id, e.pantry_id),
                  list_id: item.id,
                  position: '',
                  heading: null,
                  pantry_id: e.pantry_id,
                  text: null,
                  qty: null,
                  qty_max: null,
                  approx: false,
                  unit: null,
                  checked: false,
                  meal_id: null,
                  source_id: null,
                  needed_space_id: e.space_id,
                  auto: e.kind === 'staple' ? 'staple' : 'essential',
                }))
            : []
        const mine: ListLine[] = [...stored, ...auto]
        return {
          item,
          kind,
          meals: mealsBy.get(item.id) ?? [],
          lines: mine,
          toBuy: mine.filter(
            (l) =>
              l.heading === null &&
              !(l.meal_id && l.pantry_id && staples.has(`${item.space_id}:${l.pantry_id}`)),
          ),
        }
      })
    const shopOf = new Map<string, string>()
    for (const l of out) if (open(l.item)) for (const m of l.meals) shopOf.set(m, l.item.id)

    return {
      lists: out,
      byId: new Map(out.map((l) => [l.item.id, l])),
      shopOf,
      entries: kept,
      isLoading: isLoading || lists.isLoading,
    }
  }, [
    queued,
    items,
    isLoading,
    links,
    lists.data,
    lists.isLoading,
    lines.data,
    listMeals.data,
    entries.data,
    variationLines.data,
    variations.data,
    meals.data,
    mealLines.data,
  ])
}

/**
 * A food shop's Meals by name, day and slot (shopping.meals_of): its members
 * see even a Meal they can't read on its own. A Meal added with no signal
 * shows from what this device holds.
 */
export function useShopMeals(
  queue: WriteQueue,
  list: string,
  meals: readonly string[],
): ShopMeal[] {
  const { items } = useItems(queue)
  const { data } = useQuery({ queryKey: shopMealsKey(list), queryFn: () => fetchShopMeals(list) })
  return useMemo(() => {
    const known = new Map((data ?? []).map((m) => [m.meal_id, m]))
    const byId = new Map(items.map((i) => [i.id, i]))
    return meals
      .map((id): ShopMeal | undefined => {
        const m = known.get(id)
        if (m) return m
        const i = byId.get(id)
        return i
          ? {
              meal_id: id,
              title: i.title,
              do_on: i.do_on,
              slot: i.slot,
              servings: null,
              personal: false,
              live: true,
            }
          : undefined
      })
      .filter((m): m is ShopMeal => m !== undefined)
  }, [data, items, meals])
}
