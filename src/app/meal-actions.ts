import { useMemo } from 'react'
import { toast } from '@/components/ui/sonner'
import {
  archiveItem,
  newId,
  addMealLine,
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
      ownServings: v.servings,
      leftoversOf: v.leftoversOf,
      variation: v.variation,
      space: v.item.space_id,
      // An unsent Meal has no owner yet: it is mine.
      mine: !v.item.owner_id || v.item.owner_id === spaces.me,
      source: v.source,
      lines: v.lines,
      photo: v.photo,
    }))
    const recipeOf = (m: PlannedMeal) => {
      const r = m.variation ? food.recipeOf.get(m.variation) : undefined
      return r ? food.byId.get(r) : undefined
    }
    // A Recipe's Meal serves what its Variation does until I change it
    // there (MPL-002 2): a change to the Variation shows on the plan.
    for (const m of meals)
      if (m.servings === null && m.variation)
        m.servings =
          recipeOf(m)?.variations.find((x) => x.item.id === m.variation)?.fields.servings ?? null
    for (const m of meals) m.picture = m.photo?.path ?? recipeOf(m)?.photo?.path
    const byId = new Map(meals.map((m) => [m.id, m]))
    for (const m of meals)
      if (m.leftoversOf) m.picture = byId.get(m.leftoversOf)?.picture ?? m.picture
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

/**
 * A Recipe's Meal in a slot (MPL-002 1, 2): with no servings of its own, it
 * serves what its Variation does, now and after the Variation changes.
 */
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
        servings: c.from.ownServings ?? null,
        ...(c.leftoversOf && { leftovers_of: c.leftoversOf }),
        ...(c.from.source && { source: c.from.source }),
        ...inSpace(c.from.space),
      },
      c.id,
    )
  // A Meal's own lines go with it (MPL-006 5).
  for (const c of copies)
    if (!c.leftoversOf)
      for (const l of c.from.lines ?? [])
        addMealLine(c.id, {
          position: l.position,
          pantry_id: l.pantry_id,
          text: l.text,
          qty: l.qty,
          qty_max: l.qty_max,
          approx: l.approx,
          unit: l.unit,
        })
  toast(copies.length === 1 ? 'Copied 1 meal' : `Copied ${copies.length} meals`, {
    action: { label: 'Undo', onClick: () => copies.forEach((c) => archiveItem(c.id)) },
  })
  return copies.length
}
