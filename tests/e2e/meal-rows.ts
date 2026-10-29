import type { Locator, Page } from '@playwright/test'
import { KATSU, KATSU_STD, id, rows } from './recipe-rows'
import { itemRow } from './stand-in'

/** Thursday 15 October 2026, mid-morning in London: the week of 12–18 October. */
export const NOW = new Date('2026-10-15T10:00:00+01:00')

export const KATSU_AIR = id(70)
export const KATSU_MEAL = id(71)
export const LEFTOVERS = id(72)
export const DISHOOM = id(73)

const meal = (mealId: string, title: string, day: string, slot: string, created: string) =>
  itemRow({
    id: mealId,
    type: 'meal',
    title,
    do_on: day,
    slot,
    created_at: created,
    updated_at: created,
  })

/** The Recipes' rows, with Katsu curry's second Variation and a week of Meals. */
export function mealRows() {
  const base = rows()
  return {
    ...base,
    items: [
      ...(base.items ?? []),
      itemRow({ id: KATSU_AIR, type: 'variation', title: 'Air fryer', status: 'done' }),
      meal(KATSU_MEAL, 'Katsu curry', '2026-10-15', 'dinner', '2026-10-10T09:00:00Z'),
      meal(LEFTOVERS, 'Leftovers: Katsu curry', '2026-10-16', 'lunch', '2026-10-10T09:01:00Z'),
      meal(DISHOOM, 'Out: Dishoom', '2026-10-17', 'dinner', '2026-10-10T09:02:00Z'),
    ],
    links: [
      ...(base.links ?? []),
      { from_item: KATSU_AIR, to_item: KATSU, link_type: 'variation_of' },
      { from_item: KATSU_MEAL, to_item: KATSU_STD, link_type: 'uses' },
    ],
    variation: [
      ...(base.variation ?? []),
      {
        item_id: KATSU_AIR,
        servings: 2,
        prep_min: null,
        cook_min: null,
        sources: [],
        notes: null,
        archived_from: null,
      },
    ],
    meal: [
      { item_id: KATSU_MEAL, servings: 4, leftovers_of: null },
      { item_id: LEFTOVERS, servings: null, leftovers_of: KATSU_MEAL },
      { item_id: DISHOOM, servings: null, leftovers_of: null },
    ],
  }
}

const SLOT_NAMES: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}

/**
 * A slot's Meals ("2026-10-15:dinner"): the week's cell on a computer; on a
 * phone, the day's Meals saying that slot (Joe, 26 October).
 */
export function mealCards(page: Page, key: string): Locator {
  const [day, slot] = key.split(':') as [string, string]
  return page
    .locator(`[data-drop="${key}"] [data-slot="meal-card"]`)
    .or(
      page
        .locator(`section[data-drop="${day}"] [data-slot="meal-card"]`)
        .filter({ hasText: new RegExp(`${SLOT_NAMES[slot]}( ·|$)`) }),
    )
}

/** Opens Add a meal for a slot: its "+" on a computer; the day's "+" then the slot on a phone. */
export async function addMeal(page: Page, key: string) {
  const [day, slot] = key.split(':') as [string, string]
  const cell = page.locator(`[data-drop="${key}"]`)
  const dayOf = page.locator(`section[data-drop="${day}"]`)
  await cell.or(dayOf).first().waitFor()
  if (await cell.count()) {
    await cell
      .last()
      .getByRole('button', { name: `Add ${slot}` })
      .click()
    return
  }
  await page
    .locator(`section[data-drop="${day}"]`)
    .getByRole('button', { name: /^Add a meal/ })
    .click()
  await page
    .getByRole('dialog')
    .getByLabel('Slot')
    .getByRole('button', { name: SLOT_NAMES[slot] })
    .click()
}
