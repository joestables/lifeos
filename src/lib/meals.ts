import { addDays } from '@lifeos/recurrence'
import { fromIsoDay } from './dates'
import type { MealLine, Photo } from '@/data'

/** A Meal's slot as kept: breakfast, lunch, dinner (Joe, 18 October). */
export type SlotKey = 'breakfast' | 'lunch' | 'dinner'

export const SLOTS: readonly SlotKey[] = ['breakfast', 'lunch', 'dinner']

export const SLOT_LABEL: Record<SlotKey, 'Breakfast' | 'Lunch' | 'Dinner'> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}

const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' })

/** "Thu dinner" (patterns.md#meal-plan). */
export const slotName = (day: string, slot: string) => `${weekday.format(fromIsoDay(day))} ${slot}`

/** A Meal as the Meal plan needs it. */
export interface PlannedMeal {
  id: string
  title: string
  day: string | null
  slot: string | null
  status: string
  created_at: string
  /** What it serves: its own, else its Variation's (MPL-002 2). */
  servings: number | null
  /** Its own servings, set on the Meal; null follows its Variation. */
  ownServings?: number | null
  leftoversOf: string | null
  variation: string | null
  /** Its Space: Personal or one of my Households (MPL-002 2). */
  space?: string
  /** Whether I made it: only its maker moves it to another Space (HSH-003 2). */
  mine?: boolean
  /** A typed Meal's recipe link (MPL-006 2). */
  source?: string | null
  /** Its own ingredient lines (MPL-006 1). */
  lines?: readonly MealLine[]
  /** Its own photo: a typed Meal's, from its link (MPL-006 6). */
  photo?: Photo
  /** The picture it shows: its own, its Recipe's, or that of the Meal it is leftovers of. */
  picture?: string
}

/** A Meal's name: leftovers take the name of the Meal they are of (MPL-001 4). */
export function mealName(meal: PlannedMeal, byId: ReadonlyMap<string, PlannedMeal>): string {
  if (!meal.leftoversOf) return meal.title
  return byId.get(meal.leftoversOf)?.title ?? meal.title
}

/** Each day's Meals in each slot, in the order they were planned (MPL-001 1). */
export function weekMeals(
  meals: readonly PlannedMeal[],
  week: readonly string[],
): Map<string, PlannedMeal[]> {
  const out = new Map<string, PlannedMeal[]>()
  for (const m of [...meals].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (!m.day || !m.slot || !week.includes(m.day)) continue
    const key = `${m.day}:${m.slot}`
    out.set(key, [...(out.get(key) ?? []), m])
  }
  return out
}

/** The Recipes of my latest Meals, newest first, each once: "Planned lately" (MPL-002 1). */
export function plannedLately(
  meals: readonly PlannedMeal[],
  recipeOf: ReadonlyMap<string, string>,
  limit = 5,
): string[] {
  const out: string[] = []
  for (const m of [...meals].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    const recipe = m.variation ? recipeOf.get(m.variation) : undefined
    if (recipe && !out.includes(recipe)) out.push(recipe)
    if (out.length === limit) break
  }
  return out
}

const order = (day: string, slot: string) => `${day}:${SLOTS.indexOf(slot as SlotKey)}`

/**
 * The Meals a slot's leftovers can be of (MPL-002 3): those of the seven
 * days before it, earlier the same day too, newest first; not leftovers.
 */
export function leftoverChoices(
  meals: readonly PlannedMeal[],
  day: string,
  slot: SlotKey,
): PlannedMeal[] {
  const from = addDays(day, -7)
  const at = order(day, slot)
  return meals
    .filter(
      (m) =>
        !m.leftoversOf &&
        m.day !== null &&
        m.slot !== null &&
        m.day >= from &&
        order(m.day, m.slot) < at,
    )
    .sort((a, b) => order(b.day!, b.slot!).localeCompare(order(a.day!, a.slot!)))
}

/**
 * A Meal's leftovers a move would put before it (MPL-003 2, Joe, 26
 * October): those at or before its new day and slot; leftovers later the
 * same day stay.
 */
export function leftoversBefore<M extends Pick<PlannedMeal, 'leftoversOf' | 'day' | 'slot'>>(
  meal: string,
  day: string,
  slot: string,
  meals: readonly M[],
): M[] {
  const at = order(day, slot)
  return meals.filter(
    (l) =>
      l.leftoversOf === meal && l.day !== null && l.slot !== null && order(l.day, l.slot) <= at,
  )
}

/** Where leftovers go to start: the next lunch or dinner (patterns.md#meal-plan). */
export function nextMealSlot(day: string, slot: SlotKey): { day: string; slot: SlotKey } {
  if (slot === 'breakfast') return { day, slot: 'lunch' }
  if (slot === 'lunch') return { day, slot: 'dinner' }
  return { day: addDays(day, 1), slot: 'lunch' }
}
