import { useMemo } from 'react'
import { toast } from '@/components/ui/sonner'
import {
  archiveItem,
  newId,
  planMeal,
  queue,
  restoreItem,
  updateItem,
  useFood,
  useFoodSpaces,
  useMeals,
  type FoodData,
  type FoodSpaces,
} from '@/data'
import type { RecipeView, VariationView } from '@/data/food-hooks'
import { copyWeek, mealName, slotName, type PlannedMeal, type SlotKey } from '@/lib/meals'

/** The Meal plan's Meals, with what each needs to show (MPL-001). */
export interface MealPlanData {
  food: FoodData
  meals: PlannedMeal[]
  byId: ReadonlyMap<string, PlannedMeal>
  /** A Meal's name, leftovers taking their Meal's (MPL-001 4). */
  name: (m: PlannedMeal) => string
  /** The Recipe a Meal plans, through its Variation. */
  recipeOf: (m: PlannedMeal) => RecipeView | undefined
  variationOf: (m: PlannedMeal) => VariationView | undefined
  /** Personal and my Households, and where new Meals go (MPL-005). */
  spaces: FoodSpaces
  isLoading: boolean
}

export function useMealPlan(): MealPlanData {
  const food = useFood(queue)
  const { meals: views, isLoading } = useMeals(queue)
  const spaces = useFoodSpaces(queue)
  return useMemo(() => {
    const meals: PlannedMeal[] = views.map((v) => ({
      id: v.item.id,
      title: v.item.title,
      day: v.item.do_on,
      slot: v.item.slot,
      status: v.item.status,
      created_at: v.item.created_at,
      servings: v.servings,
      leftoversOf: v.leftoversOf,
      variation: v.variation,
      space: v.item.space_id,
    }))
    const byId = new Map(meals.map((m) => [m.id, m]))
    const recipeOf = (m: PlannedMeal) => {
      const r = m.variation ? food.recipeOf.get(m.variation) : undefined
      return r ? food.byId.get(r) : undefined
    }
    return {
      food,
      meals,
      byId,
      name: (m) => mealName(m, byId),
      recipeOf,
      variationOf: (m) => recipeOf(m)?.variations.find((v) => v.item.id === m.variation),
      spaces,
      isLoading: isLoading || food.isLoading,
    }
  }, [food, views, isLoading, spaces])
}

/** Where a new Meal goes: my default, Personal or a Household (MPL-002 2). */
const inSpace = (space: string | null | undefined) => (space ? { space_id: space } : {})

/** A Recipe's Meal in a slot, serving what its Variation does (MPL-002 1, 2). */
export function planRecipe(
  day: string,
  slot: SlotKey,
  r: RecipeView,
  v: VariationView,
  space?: string | null,
) {
  planMeal({
    title: r.item.title,
    do_on: day,
    slot,
    variation: v.item.id,
    servings: v.fields.servings,
    ...inSpace(space),
  })
}

/** A Meal I type ("Out: Dishoom"; MPL-002 3). */
export function planTyped(day: string, slot: SlotKey, title: string, space?: string | null) {
  planMeal({ title: title.trim(), do_on: day, slot, ...inSpace(space) })
}

/**
 * Leftovers of a Meal, named so on Plan: "Leftovers: Katsu curry" (PLN-008
 * 1), where the Meal is.
 */
export function planLeftovers(day: string, slot: SlotKey, of: PlannedMeal, name: string) {
  planMeal({
    title: `Leftovers: ${name}`,
    do_on: day,
    slot,
    leftovers_of: of.id,
    ...inSpace(of.space),
  })
}

/** A Meal, and its leftovers, made Personal or a Household's (MPL-003 1, HSH-003 2). */
export function setMealSpace(m: PlannedMeal, space: string, meals: readonly PlannedMeal[]) {
  for (const x of [m, ...meals.filter((l) => l.leftoversOf === m.id)])
    if (x.space !== space) updateItem(x.id, { space_id: space })
}

/** A Meal moved to another day or slot, with Undo (MPL-003 2). */
export function moveMeal(m: PlannedMeal, name: string, day: string, slot: SlotKey) {
  if (m.day === day && m.slot === slot) return
  const was = { do_on: m.day, slot: m.slot }
  updateItem(m.id, { do_on: day, slot })
  toast(`Moved "${name}" to ${slotName(day, slot)}`, {
    action: { label: 'Undo', onClick: () => updateItem(m.id, was) },
  })
}

/** Removes a Meal and its leftovers, with Undo (MPL-003 3, ITM-006 3). */
export function removeMeal(m: PlannedMeal, name: string, meals: readonly PlannedMeal[]) {
  const gone = [m, ...meals.filter((x) => x.leftoversOf === m.id)]
  for (const x of gone) archiveItem(x.id)
  toast(`Removed "${name}"`, {
    action: { label: 'Undo', onClick: () => gone.forEach((x) => restoreItem(x.id)) },
  })
}

/** Ticks a Meal eaten, or not: no cook is logged (MPL-003 5). */
export function setEaten(m: PlannedMeal, eaten: boolean) {
  updateItem(m.id, { status: eaten ? 'done' : 'active' })
}

/** A week's Meals made again in another (MPL-004), with Undo. */
export function copyMeals(meals: readonly PlannedMeal[], from: string, to: string) {
  const copies = copyWeek(meals, from, to, newId)
  for (const c of copies)
    planMeal(
      {
        title: c.from.title,
        do_on: c.day,
        slot: c.from.slot as SlotKey,
        ...(c.from.variation && { variation: c.from.variation }),
        servings: c.from.servings,
        ...(c.leftoversOf && { leftovers_of: c.leftoversOf }),
        ...inSpace(c.from.space),
      },
      c.id,
    )
  toast(copies.length === 1 ? 'Copied 1 meal' : `Copied ${copies.length} meals`, {
    action: { label: 'Undo', onClick: () => copies.forEach((c) => archiveItem(c.id)) },
  })
  return copies.length
}
