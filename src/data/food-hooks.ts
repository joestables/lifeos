import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useAuth } from './auth'
import {
  applyPendingCooks,
  applyPendingLines,
  applyPendingMeals,
  applyPendingMealLines,
  applyPendingPantry,
  applyPendingRecipes,
  applyPendingSteps,
  applyPendingValues,
  applyPendingVariations,
  blankHeading,
  blankVariation,
  activityKey,
  applyPendingNotes,
  changeNotesKey,
  fetchChangeNotes,
  cooksKey,
  fetchActivity,
  fetchCooks,
  fetchLines,
  fetchMeals,
  fetchMealLines,
  fetchPantry,
  fetchPersonalSpace,
  fetchRecipes,
  fetchSteps,
  fetchValues,
  fetchVariations,
  linesKey,
  mealsKey,
  mealLinesKey,
  pantryKey,
  personalSpaceKey,
  recipesKey,
  stepsKey,
  valuesKey,
  variationsKey,
  type Activity,
  type Cook,
  type FoodValue,
  type Line,
  type MealLine,
  type PantryEntry,
  type RecipeHeading,
  type Step,
  type VariationFields,
} from './food'
import { useItems, useLinks, useMarks, useQueueEntries, useSettings } from './hooks'
import { useHouseholds } from './households'
import { applyPendingPhotos, fetchPhotos, photosKey, type Photo } from './photos'
import type { WriteQueue } from './queue/queue'
import type { Item } from './types'

export type FoodState = 'idea' | 'active' | 'done' | 'cancelled'

export interface VariationView {
  item: Item
  fields: VariationFields
  lines: Line[]
  steps: Step[]
  cooks: Cook[]
  /** Whether I wrote it, so may edit it (ADR-0051). */
  mine: boolean
}

export interface RecipeView {
  item: Item
  heading: RecipeHeading
  /** The author's first, then members', each by when made. */
  variations: VariationView[]
  /** The one that opens: the chosen default, else the first live one. */
  defaultVariation: VariationView | undefined
  /**
   * Worked out as the server does (ADR-0011): the highest live Variation's
   * state, Archived only when all are; so an unsent change shows at once.
   */
  state: FoodState
  mine: boolean
  favourite: boolean
  /** Its photo (ADR-0052), if it has one. */
  photo: Photo | undefined
  /** Every cook of any of its Variations, newest first. */
  cooks: Cook[]
}

export interface FoodData {
  recipes: RecipeView[]
  byId: ReadonlyMap<string, RecipeView>
  /** Which Recipe a Variation belongs to. */
  recipeOf: ReadonlyMap<string, string>
  pantry: ReadonlyMap<string, PantryEntry>
  values: FoodValue[]
  me: string
  isLoading: boolean
}

const RANK: Record<string, number> = { done: 3, active: 2, idea: 1 }

export function deriveState(variations: readonly { status: string }[]): FoodState | null {
  if (!variations.length) return null
  const live = variations.filter((v) => v.status !== 'cancelled')
  if (!live.length) return 'cancelled'
  let best: FoodState = 'idea'
  for (const v of live) if ((RANK[v.status] ?? 0) > (RANK[best] ?? 0)) best = v.status as FoodState
  return best
}

/**
 * A Recipe's state: archived when it is (its Variations follow on the
 * server); brought back but not yet sent, as it was set; else worked out.
 */
function stateOf(item: Item, vs: readonly VariationView[]): FoodState {
  if (item.status === 'cancelled') return 'cancelled'
  const derived = deriveState(vs.map((v) => v.item))
  if (derived === null || (derived === 'cancelled' && item.sync)) return item.status as FoodState
  return derived
}

function group<T>(rows: readonly T[], key: (r: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>()
  for (const r of rows) {
    const k = key(r)
    const list = out.get(k)
    if (list) list.push(r)
    else out.set(k, [r])
  }
  return out
}

/** Recipes and everything under them, with unsent changes laid over (RCP-016 1). */
export function useFood(queue: WriteQueue): FoodData {
  const auth = useAuth()
  const me = auth.status === 'signed-in' ? auth.me.id : ''
  const entries = useQueueEntries(queue)
  const { items, isLoading: itemsLoading } = useItems(queue)
  const links = useLinks(queue)
  const marks = useMarks(queue)
  const recipes = useQuery({ queryKey: recipesKey, queryFn: fetchRecipes })
  const variations = useQuery({ queryKey: variationsKey, queryFn: fetchVariations })
  const lines = useQuery({ queryKey: linesKey, queryFn: fetchLines })
  const steps = useQuery({ queryKey: stepsKey, queryFn: fetchSteps })
  const cooks = useQuery({ queryKey: cooksKey, queryFn: fetchCooks })
  const pantry = useQuery({ queryKey: pantryKey, queryFn: fetchPantry })
  const values = useQuery({ queryKey: valuesKey, queryFn: fetchValues })
  const photos = useQuery({ queryKey: photosKey, queryFn: fetchPhotos })

  return useMemo(() => {
    const headings = new Map(
      applyPendingRecipes(recipes.data ?? [], entries).map((r) => [r.item_id, r]),
    )
    const fields = new Map(
      applyPendingVariations(variations.data ?? [], entries).map((v) => [v.item_id, v]),
    )
    const linesBy = group(applyPendingLines(lines.data ?? [], entries), (l) => l.variation_id)
    const stepsBy = group(applyPendingSteps(steps.data ?? [], entries), (s) => s.variation_id)
    const cooksBy = group(applyPendingCooks(cooks.data ?? [], entries, me), (c) => c.variation_id)
    const itemById = new Map(items.map((i) => [i.id, i]))
    const photoOf = new Map(
      applyPendingPhotos(photos.data ?? [], entries).map((p) => [p.item_id, p]),
    )
    const recipeOf = new Map(
      links.filter((l) => l.link_type === 'variation_of').map((l) => [l.from_item, l.to_item]),
    )
    // An unsent Item has no owner yet: it is mine.
    const isMine = (i: Item) => i.owner_id === me || i.owner_id === ''

    const under = group(
      [...recipeOf.entries()].filter(([v]) => itemById.has(v)),
      ([, r]) => r,
    )
    const views: RecipeView[] = []
    for (const item of items) {
      if (item.type !== 'recipe') continue
      const vs: VariationView[] = (under.get(item.id) ?? [])
        .map(([v]) => itemById.get(v)!)
        .map((v) => ({
          item: v,
          fields: fields.get(v.id) ?? blankVariation(v.id),
          lines: linesBy.get(v.id) ?? [],
          steps: stepsBy.get(v.id) ?? [],
          cooks: cooksBy.get(v.id) ?? [],
          mine: isMine(v),
        }))
        .sort((a, b) =>
          a.item.owner_id === item.owner_id && b.item.owner_id !== item.owner_id
            ? -1
            : b.item.owner_id === item.owner_id && a.item.owner_id !== item.owner_id
              ? 1
              : a.item.created_at < b.item.created_at
                ? -1
                : 1,
        )
      const heading = headings.get(item.id) ?? blankHeading(item.id)
      const live = vs.filter((v) => v.item.status !== 'cancelled')
      views.push({
        item,
        heading,
        variations: vs,
        defaultVariation:
          vs.find(
            (v) => v.item.id === heading.default_variation && v.item.status !== 'cancelled',
          ) ??
          live[0] ??
          vs[0],
        state: stateOf(item, vs),
        mine: isMine(item),
        favourite: marks.has(item.id),
        photo: photoOf.get(item.id),
        cooks: vs.flatMap((v) => v.cooks).sort((a, b) => (a.cooked_at < b.cooked_at ? 1 : -1)),
      })
    }
    return {
      recipes: views,
      byId: new Map(views.map((v) => [v.item.id, v])),
      recipeOf,
      pantry: new Map(applyPendingPantry(pantry.data ?? [], entries, me).map((p) => [p.id, p])),
      values: applyPendingValues(values.data ?? [], entries, me),
      me,
      isLoading:
        itemsLoading ||
        recipes.isLoading ||
        variations.isLoading ||
        lines.isLoading ||
        steps.isLoading ||
        pantry.isLoading,
    }
  }, [
    entries,
    items,
    itemsLoading,
    links,
    marks,
    me,
    recipes.data,
    recipes.isLoading,
    variations.data,
    variations.isLoading,
    lines.data,
    lines.isLoading,
    steps.data,
    steps.isLoading,
    cooks.data,
    pantry.data,
    pantry.isLoading,
    values.data,
    photos.data,
  ])
}

/** A Meal on the plan (MPL-001): its Item, servings, and what it plans or is leftovers of. */
export interface MealView {
  item: Item
  servings: number | null
  /** The Meal it is leftovers of. */
  leftoversOf: string | null
  /** The Variation it uses; none for a typed Meal or leftovers. */
  variation: string | null
  /** A typed Meal's recipe link (MPL-006 2). */
  source: string | null
  /** Its own ingredient lines, in order (MPL-006 1). */
  lines: MealLine[]
  /** Its own photo: a typed Meal's, from its link (MPL-006 6). */
  photo?: Photo
}

/** The Meals I can see, not removed, with unsent ones and changes laid over. */
export function useMeals(queue: WriteQueue): { meals: MealView[]; isLoading: boolean } {
  const entries = useQueueEntries(queue)
  const { items, isLoading: itemsLoading } = useItems(queue)
  const links = useLinks(queue)
  const rows = useQuery({ queryKey: mealsKey, queryFn: fetchMeals })
  const lineRows = useQuery({ queryKey: mealLinesKey, queryFn: fetchMealLines })
  const photos = useQuery({ queryKey: photosKey, queryFn: fetchPhotos })
  return useMemo(() => {
    const photoOf = new Map(
      applyPendingPhotos(photos.data ?? [], entries).map((p) => [p.item_id, p]),
    )
    const fields = new Map(applyPendingMeals(rows.data ?? [], entries).map((r) => [r.item_id, r]))
    const linesBy = group(applyPendingMealLines(lineRows.data ?? [], entries), (l) => l.meal_id)
    const uses = new Map(
      links.filter((l) => l.link_type === 'uses').map((l) => [l.from_item, l.to_item]),
    )
    const meals = items
      .filter((i) => i.type === 'meal' && i.archived_at === null && i.status !== 'cancelled')
      .map((item) => ({
        item,
        servings: fields.get(item.id)?.servings ?? null,
        leftoversOf: fields.get(item.id)?.leftovers_of ?? null,
        variation: uses.get(item.id) ?? null,
        source: fields.get(item.id)?.source ?? null,
        lines: linesBy.get(item.id) ?? [],
        photo: photoOf.get(item.id),
      }))
    return { meals, isLoading: itemsLoading || rows.isLoading }
  }, [entries, items, itemsLoading, links, rows.data, rows.isLoading, lineRows.data, photos.data])
}

/** Where food can go: Personal, or one of my Households (MPL-005, HSH-003 2). */
export interface FoodSpaces {
  /** My id. */
  me: string
  /** My Personal Space. */
  personal: string | null
  /** Personal first, then my Households, each with what to call it. */
  spaces: { id: string; name: string }[]
  /** Where my new Meals go (MPL-005), and whose staples and Essentials show first (SHP-005). */
  home: string | null
  /** A Household's name, for an Item in it; undefined for Personal. */
  householdName: (space: string | null | undefined) => string | undefined
  /** The first name of someone in my Households ("Sam"), for whose a Recipe is. */
  firstName: (person: string) => string
  /** Me, then everyone else in my Households, for Created by (RCP-001 5). */
  people: { id: string; name: string }[]
}

/**
 * My Spaces for food, and where new Meals go: my choice in Settings → Food
 * while it is still one of mine, else Personal.
 */
export function useFoodSpaces(queue: WriteQueue): FoodSpaces {
  const auth = useAuth()
  const me = auth.status === 'signed-in' ? auth.me.id : ''
  const { data: personal } = useQuery({
    queryKey: personalSpaceKey,
    queryFn: () => fetchPersonalSpace(me),
    enabled: me !== '',
    staleTime: Infinity,
  })
  const { households } = useHouseholds(queue)
  const settings = useSettings(queue)
  return useMemo(() => {
    const names = new Map(households.map((h) => [h.id, h.name]))
    const chosen = settings.mealSpaceId
    const people = new Map<string, string>()
    for (const h of households)
      for (const m of h.members)
        if (m.name || !people.has(m.person_id)) people.set(m.person_id, m.name)
    const firstName = (person: string) => people.get(person)?.split(' ')[0] || 'Someone'
    return {
      me,
      personal: personal ?? null,
      spaces: [
        ...(personal ? [{ id: personal, name: 'Personal' }] : []),
        ...households.map((h) => ({ id: h.id, name: h.name })),
      ],
      home: chosen && names.has(chosen) ? chosen : (personal ?? null),
      householdName: (space) => (space ? names.get(space) : undefined),
      firstName,
      people: [
        ...(me ? [{ id: me, name: 'Me' }] : []),
        ...[...people.keys()]
          .filter((id) => id !== me)
          .map((id) => ({ id, name: people.get(id) || 'Someone' }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      ],
    }
  }, [me, personal, households, settings.mealSpaceId])
}

/**
 * What happened to a Recipe and its Variations, newest first, and the notes
 * on its changes, unsent ones too (RCP-013).
 */
export function useRecipeActivity(
  queue: WriteQueue,
  ids: readonly string[],
): { activity: Activity[]; notes: ReadonlyMap<number, string> } {
  const sorted = [...ids].sort()
  const entries = useQueueEntries(queue)
  const { data } = useQuery({
    queryKey: activityKey(sorted),
    queryFn: () => fetchActivity(sorted),
    enabled: sorted.length > 0,
  })
  const { data: notes } = useQuery({
    queryKey: changeNotesKey(sorted),
    queryFn: () => fetchChangeNotes(sorted),
    enabled: sorted.length > 0,
  })
  return useMemo(
    () => ({ activity: data ?? [], notes: applyPendingNotes(notes ?? [], entries) }),
    [data, notes, entries],
  )
}

/**
 * Every Pantry entry any Recipe's line uses, a deleted Recipe's too
 * (PAN-001 4): those keep their entries until they are gone for good, so
 * such an entry can't be deleted either. A past or deleted Meal's line
 * doesn't keep it: it becomes typed when the entry goes.
 */
export function usePantryInUse(queue: WriteQueue): ReadonlySet<string> {
  const entries = useQueueEntries(queue)
  const lines = useQuery({ queryKey: linesKey, queryFn: fetchLines })
  return useMemo(
    () =>
      new Set(
        applyPendingLines(lines.data ?? [], entries)
          .map((l) => l.pantry_id)
          .filter((id): id is string => id !== null),
      ),
    [entries, lines.data],
  )
}
