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
