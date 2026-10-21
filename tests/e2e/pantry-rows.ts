import { KATSU_STD, id, rows } from './recipe-rows'
import { ANN } from './stand-in'

export const SAM = '00000000-0000-4000-8000-00000000005a'
export const GARLIC = id(60)
export const SPRING = id(61)
export const GREEN = id(62)
export const SCALLIONS = id(63)
export const BIN_BAGS = id(64)

const entry = (
  entryId: string,
  name: string,
  aisle: string | null,
  extra: Record<string, unknown> = {},
) => ({
  id: entryId,
  name,
  kind: aisle ? 'ingredient' : 'household',
  aisle,
  default_unit: null,
  added_by: ANN.id,
  ...extra,
})

/** The Recipes' rows, with a fuller Pantry and my staples. */
export function pantryRows() {
  const base = rows()
  return {
    ...base,
    pantry: [
      ...(base.pantry ?? []),
      entry(GARLIC, 'Garlic', 'fruit_veg', { default_unit: 'clove' }),
      entry(SPRING, 'Spring onions', 'fruit_veg'),
      entry(GREEN, 'Green onions', 'fruit_veg'),
      entry(SCALLIONS, 'Scallions', 'fruit_veg', { added_by: SAM }),
      entry(BIN_BAGS, 'Bin bags', null),
    ],
    variation_lines: [
      ...(base.variation_lines ?? []),
      { id: id(65), variation_id: KATSU_STD, position: 'e', qty: 2, pantry_id: GREEN },
      { id: id(66), variation_id: KATSU_STD, position: 'f', qty: 1, unit: 'tbsp', text: 'Mirin' },
    ],
    staples: [
      { space_id: 's', pantry_id: GARLIC, out_of_stock: true },
      { space_id: 's', pantry_id: BIN_BAGS, out_of_stock: false },
    ],
  }
}
