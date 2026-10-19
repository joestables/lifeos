import { ANN, itemRow, type Rows } from './stand-in'

/** Recipes as the database keeps them, for the Recipes walks. */
export const id = (n: number) => `01990000-0000-7000-8000-0000000004${String(n).padStart(2, '0')}`

export const KATSU = id(1)
export const KATSU_STD = id(2)
export const NOODLES = id(3)
export const NOODLES_STD = id(4)
export const SHAKSHUKA = id(5)
export const SHAKSHUKA_STD = id(6)
export const BIRRIA = id(7)
export const BIRRIA_V = id(8)
export const STEW = id(9)
export const STEW_V = id(10)
export const SAUCE = id(11)
export const SAUCE_V = id(12)
export const PANKO = id(20)
export const CHICKEN = id(21)

/** A Recipe with one Variation, as the database keeps it. */
function recipe(
  r: string,
  v: string,
  title: string,
  status: string,
  heading: Record<string, unknown> = {},
  created = '2026-10-01T09:00:00Z',
) {
  return {
    items: [
      itemRow({ id: r, type: 'recipe', title, status, created_at: created }),
      itemRow({ id: v, type: 'variation', title: 'Standard', status, created_at: created }),
    ],
    link: { from_item: v, to_item: r, link_type: 'variation_of' },
    heading: { item_id: r, default_variation: v, ...heading },
    fields: { item_id: v, servings: 4, prep_min: 20, cook_min: 25 },
  }
}

export function rows(): Rows {
  const all = [
    recipe(
      KATSU,
      KATSU_STD,
      'Katsu curry',
      'done',
      {
        category: 'Dinner',
        cuisine: 'Japanese',
        tags: ['Quick'],
        protein: ['Chicken'],
      },
      '2026-10-02T09:00:00Z',
    ),
    recipe(
      NOODLES,
      NOODLES_STD,
      'Gochujang noodles',
      'active',
      {
        category: 'Dinner',
        cuisine: 'Korean',
      },
      '2026-10-03T09:00:00Z',
    ),
    recipe(
      SHAKSHUKA,
      SHAKSHUKA_STD,
      'Shakshuka',
      'done',
      {
        category: 'Breakfast',
        cuisine: 'North African',
      },
      '2026-10-04T09:00:00Z',
    ),
    recipe(BIRRIA, BIRRIA_V, 'Birria tacos', 'idea', {}, '2026-10-05T09:00:00Z'),
    recipe(STEW, STEW_V, 'Old stew', 'cancelled'),
    recipe(SAUCE, SAUCE_V, 'Katsu sauce', 'done', { category: 'Condiments' }),
  ]
  return {
    items: all.flatMap((r) => r.items),
    links: all.map((r) => r.link),
    recipe: all.map((r) => r.heading),
    variation: [...all.map((r) => r.fields)].map((f) =>
      f.item_id === BIRRIA_V
        ? {
            ...f,
            servings: null,
            sources: ['https://www.youtube.com/watch?v=b1'],
            notes: 'Find one without the slow cooker',
          }
        : f,
    ),
    pantry: [
      {
        id: PANKO,
        name: 'Panko breadcrumbs',
        kind: 'ingredient',
        aisle: 'cupboard',
        default_unit: 'g',
        added_by: ANN.id,
      },
      {
        id: CHICKEN,
        name: 'Chicken thighs',
        kind: 'ingredient',
        aisle: 'protein',
        default_unit: null,
        added_by: ANN.id,
      },
    ],
    variation_lines: [
      { id: id(30), variation_id: KATSU_STD, position: 'a', qty: 4, pantry_id: CHICKEN },
      { id: id(31), variation_id: KATSU_STD, position: 'b', qty: 100, unit: 'g', pantry_id: PANKO },
      { id: id(32), variation_id: KATSU_STD, position: 'c', heading: 'For the sauce' },
      {
        id: id(33),
        variation_id: KATSU_STD,
        position: 'd',
        qty: 1,
        qty_max: 2,
        unit: 'tbsp',
        text: 'Honey',
      },
    ],
    variation_steps: [
      { id: id(40), variation_id: KATSU_STD, position: 'a', text: 'Rinse the rice and cook it.' },
      {
        id: id(41),
        variation_id: KATSU_STD,
        position: 'b',
        text: `Make the @[Katsu sauce](${SAUCE}) and keep it warm.`,
      },
      {
        id: id(42),
        variation_id: KATSU_STD,
        position: 'c',
        text: 'Air fry at 200°C for 12 minutes, turning halfway.',
      },
    ],
    marks: [],
  }
}
