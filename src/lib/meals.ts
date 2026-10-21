import { addDays, daysBetween } from '@lifeos/recurrence'
import { fromIsoDay } from './dates'
import { mondayOf } from './plan'

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
  servings: number | null
  leftoversOf: string | null
  variation: string | null
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

/** Where leftovers go to start: the next lunch or dinner (patterns.md#meal-plan). */
export function nextMealSlot(day: string, slot: SlotKey): { day: string; slot: SlotKey } {
  if (slot === 'breakfast') return { day, slot: 'lunch' }
  if (slot === 'lunch') return { day, slot: 'dinner' }
  return { day: addDays(day, 1), slot: 'lunch' }
}

/** A Meal made again in another week (MPL-004): its new id, and what it is copied from. */
export interface CopiedMeal {
  id: string
  from: PlannedMeal
  day: string
  /** The copy of the Meal it is leftovers of, when that is copied too. */
  leftoversOf: string | null
}

/**
 * A week's Meals made again in the week of `to` (MPL-004 1): the same
 * weekday and slot; leftovers stay leftovers of their Meal's copy, or of
 * the Meal itself when it isn't in the week.
 */
export function copyWeek(
  meals: readonly PlannedMeal[],
  from: string,
  to: string,
  newId: () => string,
): CopiedMeal[] {
  const shift = daysBetween(mondayOf(from), mondayOf(to))
  const week = new Set(Array.from({ length: 7 }, (_, i) => addDays(mondayOf(from), i)))
  const copied = meals.filter((m) => m.day && m.slot && week.has(m.day))
  const ids = new Map(copied.map((m) => [m.id, newId()]))
  // Meals before leftovers: the server checks the Meal leftovers are of.
  return [...copied.filter((m) => !m.leftoversOf), ...copied.filter((m) => m.leftoversOf)].map(
    (m) => ({
      id: ids.get(m.id)!,
      from: m,
      day: addDays(m.day!, shift),
      leftoversOf: m.leftoversOf ? (ids.get(m.leftoversOf) ?? m.leftoversOf) : null,
    }),
  )
}
