import { describe, expect, it } from 'vitest'
import {
  applyPendingMealLines,
  applyPendingCooks,
  applyPendingLines,
  applyPendingMeals,
  applyPendingPantry,
  applyPendingRecipes,
  applyPendingEntries,
  applyPendingSteps,
  applyPendingVariations,
  type Line,
  type PantryEntry,
} from './food'
import { deriveState } from './food-hooks'
import { positionBetween, positionsFor } from './food-writes'
import { applyPendingLinks } from './links'
import { applyPending } from './overlay'
import type { QueueEntry } from './queue/store'

const entry = (fn: string, args: Record<string, unknown>): QueueEntry =>
  ({
    id: fn,
    fn,
    args,
    itemIds: [],
    createdAt: 0,
    attempts: 0,
    state: 'pending',
  }) as unknown as QueueEntry

const create = entry('food.create_recipe', {
  p_id: 'r',
  p_variation: 'v',
  p_name: ' Katsu curry ',
  p_status: 'active',
  p_variation_name: 'Standard',
})

describe('RCP-006, RCP-016: a new Recipe shows at once, offline too', () => {
  it('makes the Recipe and its first Variation, linked, both Drafts', () => {
    const items = applyPending([], [create])
    expect(items.map((i) => [i.id, i.type, i.title, i.status, i.sync])).toEqual([
      ['r', 'recipe', 'Katsu curry', 'active', 'pending'],
      ['v', 'variation', 'Standard', 'active', 'pending'],
    ])
    expect(applyPendingLinks([], [create])).toEqual([
      { from_item: 'v', to_item: 'r', link_type: 'variation_of' },
    ])
    expect(applyPendingRecipes([], [create])[0]).toMatchObject({
      item_id: 'r',
      default_variation: 'v',
    })
    expect(applyPendingVariations([], [create])[0]).toMatchObject({ item_id: 'v', sources: [] })
  })

  it('changes the heading by the fields given (RCP-006 1)', () => {
    const [heading] = applyPendingRecipes(applyPendingRecipes([], [create]), [
      entry('food.update_recipe', {
        p_id: 'r',
        p_patch: { cuisine: ' Japanese ', tags: ['Quick', ' '] },
      }),
    ])
    expect(heading).toMatchObject({ cuisine: 'Japanese', tags: ['Quick'], category: null })
  })
})

describe('RCP-018 1: a list rename reaches my Recipes at once', () => {
  const headings = applyPendingRecipes(
    applyPendingRecipes([], [create, { ...create, args: { ...create.args, p_id: 'theirs' } }]),
    [
      entry('food.update_recipe', {
        p_id: 'r',
        p_patch: { cuisine: 'chinese', tags: ['Spicy', 'quick', 'Batch'] },
      }),
      entry('food.update_recipe', { p_id: 'theirs', p_patch: { cuisine: 'Chinese' } }),
    ],
  )
  const move = (kind: string, from: string, to: string) =>
    entry('food.move_value_uses', { p_kind: kind, p_from: from, p_to: to })

  it('renames mine, whatever the case, and leaves others’', () => {
    const out = applyPendingRecipes(
      headings,
      [move('cuisine', 'Chinese', 'Indian')],
      (id) => id === 'r',
    )
    expect(out.map((h) => [h.item_id, h.cuisine])).toEqual([
      ['r', 'Indian'],
      ['theirs', 'Chinese'],
    ])
  })

  it('keeps a renamed tag in its place, once, spelt as the new name', () => {
    const [mine] = applyPendingRecipes(
      headings,
      [move('tag', 'Spicy', 'Quick')],
      (id) => id === 'r',
    )
    expect(mine!.tags).toEqual(['Quick', 'Batch'])
  })
})

describe('RCP-007, RCP-008: lines and steps', () => {
  const lines: Line[] = [
    {
      id: 'l1',
      variation_id: 'v',
      position: 'i',
      heading: null,
      pantry_id: null,
      text: 'Honey',
      qty: 1,
      qty_max: 2,
      approx: false,
      unit: 'tbsp',
    },
  ]

  it('adds, changes and removes lines, in position order', () => {
    const before = positionBetween(null, 'i')
    const out = applyPendingLines(lines, [
      entry('food.add_line', {
        p_id: 'l0',
        p_variation: 'v',
        p_fields: { position: before, heading: 'For the sauce' },
      }),
      entry('food.update_line', { p_id: 'l1', p_patch: { qty: 2, qty_max: null } }),
    ])
    expect(out.map((l) => [l.id, l.heading, l.qty, l.qty_max])).toEqual([
      ['l0', 'For the sauce', null, null],
      ['l1', null, 2, null],
    ])
    expect(applyPendingLines(out, [entry('food.remove_line', { p_id: 'l0' })])).toHaveLength(1)
  })

  it("a new Variation copies another's lines and steps (RCP-009 1)", () => {
    const copy = entry('food.add_variation', {
      p_id: 'w',
      p_recipe: 'r',
      p_name: 'Air fryer',
      p_from: 'v',
    })
    expect(applyPendingLines(lines, [copy]).filter((l) => l.variation_id === 'w')).toHaveLength(1)
    const steps = applyPendingSteps(
      [{ id: 's1', variation_id: 'v', position: 'i', text: 'Air fry for 12 minutes.' }],
      [copy],
    )
    expect(steps.filter((s) => s.variation_id === 'w').map((s) => s.text)).toEqual([
      'Air fry for 12 minutes.',
    ])
    expect(applyPending([], [copy])[0]).toMatchObject({ type: 'variation', status: 'active' })
    expect(applyPendingLinks([], [copy])).toEqual([
      { from_item: 'w', to_item: 'r', link_type: 'variation_of' },
    ])
  })
})

describe('positions between others', () => {
  it('sorts between, before the first and after the last', () => {
    const [a, b, c] = positionsFor(3) as [string, string, string]
    expect(a < b && b < c).toBe(true)
    const mid = positionBetween(a, b)
    expect(a < mid && mid < b).toBe(true)
    const first = positionBetween(null, a)
    expect(first < a).toBe(true)
    const tight = positionBetween('i', 'j')
    expect('i' < tight && tight < 'j').toBe(true)
  })
})

describe("RCP-010: a Recipe's state is worked out from its Variations", () => {
  it('takes the highest live one; Archived only when all are', () => {
    expect(deriveState([{ status: 'idea' }, { status: 'active' }])).toBe('active')
    expect(deriveState([{ status: 'done' }, { status: 'cancelled' }])).toBe('done')
    expect(deriveState([{ status: 'cancelled' }, { status: 'cancelled' }])).toBe('cancelled')
    expect(deriveState([])).toBeNull()
  })
})

describe('RCP-012: a cook shows at once', () => {
  it('is logged, then its verdict changed', () => {
    const out = applyPendingCooks(
      [],
      [
        entry('food.log_cook', {
          p_id: 'c',
          p_variation: 'v',
          p_fields: { verdict: 4, notes: ' More honey ' },
        }),
        entry('food.update_cook', { p_id: 'c', p_patch: { verdict: 5 } }),
      ],
      'me',
    )
    expect(out[0]).toMatchObject({ person_id: 'me', verdict: 5, notes: 'More honey' })
  })
})

describe('PAN-001–003: the Pantry shows what I change at once, offline too', () => {
  const garlic: PantryEntry = {
    id: 'g',
    name: 'Garlic',
    kind: 'ingredient',
    aisle: 'fruit_veg',
    default_unit: 'clove',
    added_by: 'me',
  }
  const roll: PantryEntry = {
    ...garlic,
    id: 'k',
    name: 'Kitchen roll',
    kind: 'household',
    aisle: null,
  }

  it('adds an entry trimmed, an ingredient in Cupboard to start, a household item in no aisle', () => {
    const out = applyPendingPantry(
      [],
      [
        entry('food.add_pantry', { p_id: 'a', p_fields: { name: '  Spring   onions ' } }),
        entry('food.add_pantry', { p_id: 'b', p_fields: { name: 'Bin bags', kind: 'household' } }),
      ],
      'me',
    )
    expect(out.map((p) => [p.name, p.kind, p.aisle, p.added_by])).toEqual([
      ['Spring onions', 'ingredient', 'cupboard', 'me'],
      ['Bin bags', 'household', null, 'me'],
    ])
  })

  it('renames, moves aisle and changes kind; a household item loses its aisle', () => {
    const out = applyPendingPantry(
      [garlic, roll],
      [
        entry('food.update_pantry', {
          p_id: 'g',
          p_patch: { name: 'Garlic cloves', aisle: 'cupboard' },
        }),
        entry('food.update_pantry', { p_id: 'g', p_patch: { kind: 'household' } }),
        entry('food.update_pantry', { p_id: 'k', p_patch: { kind: 'ingredient' } }),
      ],
      'me',
    )
    expect(out.map((p) => [p.name, p.kind, p.aisle])).toEqual([
      ['Garlic cloves', 'household', null],
      ['Kitchen roll', 'ingredient', 'cupboard'],
    ])
  })

  it('deletes an entry, and a merge leaves only the one kept', () => {
    const deleted = applyPendingPantry(
      [garlic, roll],
      [entry('food.remove_pantry', { p_id: 'k' })],
      'me',
    )
    expect(deleted.map((p) => p.id)).toEqual(['g'])
    const merged = applyPendingPantry(
      [garlic, roll],
      [entry('food.merge_pantry', { p_keep: 'g', p_merge: 'k' })],
      'me',
    )
    expect(merged.map((p) => p.id)).toEqual(['g'])
  })

  it('PAN-003 1: a merge moves every line to the entry kept', () => {
    const line = (id: string, pantry_id: string): Line => ({
      id,
      variation_id: 'v',
      position: id,
      heading: null,
      pantry_id,
      text: null,
      qty: null,
      qty_max: null,
      approx: false,
      unit: null,
    })
    const out = applyPendingLines(
      [line('a', 'k'), line('b', 'g')],
      [entry('food.merge_pantry', { p_keep: 'g', p_merge: 'k' })],
    )
    expect(out.map((l) => l.pantry_id)).toEqual(['g', 'g'])
  })
})

describe('SHP-005: staples and Essentials show at once', () => {
  const kept = (pantry_id: string, kind = 'staple', needed = false) => ({
    space_id: 's',
    pantry_id,
    kind,
    needed,
  })

  it('keeps one, marks it needed, makes it an Essential, and takes it off', () => {
    const marked = applyPendingEntries(
      [],
      [
        entry('food.keep_entry', {
          p_space: 's',
          p_pantry: 'g',
          p_kind: 'staple',
          p_needed: false,
        }),
        entry('food.keep_entry', { p_space: 's', p_pantry: 'g', p_kind: 'staple', p_needed: true }),
      ],
    )
    expect(marked).toEqual([kept('g', 'staple', true)])
    expect(
      applyPendingEntries(marked, [
        entry('food.keep_entry', { p_space: 's', p_pantry: 'g', p_kind: 'essential' }),
      ]),
    ).toEqual([kept('g', 'essential')])
    expect(
      applyPendingEntries(marked, [entry('food.remove_entry', { p_space: 's', p_pantry: 'g' })]),
    ).toEqual([])
  })

  it('SHP-003 4: a tick clears what it names', () => {
    const cleared = applyPendingEntries(
      [kept('g', 'staple', true), kept('m', 'essential', true)],
      [entry('shopping.tick', { p_ids: ['l'], p_checked: true })],
      () => [{ space_id: 's', pantry_id: 'g' }],
    )
    expect(cleared).toEqual([kept('g', 'staple'), kept('m', 'essential', true)])
  })

  it('a merge keeps one, needed if either was; a deletion drops it', () => {
    const merged = applyPendingEntries(
      [kept('g'), kept('k', 'staple', true)],
      [entry('food.merge_pantry', { p_keep: 'g', p_merge: 'k' })],
    )
    expect(merged).toEqual([kept('g', 'staple', true)])
    const moved = applyPendingEntries(
      [kept('k')],
      [entry('food.merge_pantry', { p_keep: 'g', p_merge: 'k' })],
    )
    expect(moved).toEqual([kept('g')])
    expect(applyPendingEntries([kept('g')], [entry('food.remove_pantry', { p_id: 'g' })])).toEqual(
      [],
    )
  })
})

describe('MPL-002, MPL-003: a Meal shows at once, offline too', () => {
  const plan = entry('food.plan_meal', {
    p_id: 'm',
    p_fields: {
      title: ' Katsu curry ',
      do_on: '2026-10-15',
      slot: 'dinner',
      status: 'active',
      variation: 'v',
      servings: 4,
    },
  })

  it('makes the Meal an Item on its day and slot, named as sent', () => {
    const [m] = applyPending([], [plan])
    expect([m?.type, m?.title, m?.do_on, m?.slot, m?.sync]).toEqual([
      'meal',
      'Katsu curry',
      '2026-10-15',
      'dinner',
      'pending',
    ])
  })

  it('keeps its servings, then a change to them', () => {
    expect(applyPendingMeals([], [plan])).toEqual([
      { item_id: 'm', servings: 4, leftovers_of: null, source: null },
    ])
    expect(
      applyPendingMeals(
        [],
        [plan, entry('food.update_meal', { p_id: 'm', p_patch: { servings: 6 } })],
      ),
    ).toEqual([{ item_id: 'm', servings: 6, leftovers_of: null, source: null }])
  })

  it('MPL-006: keeps its link, and its own lines added, changed and removed', () => {
    expect(
      applyPendingMeals(
        [],
        [
          plan,
          entry('food.update_meal', { p_id: 'm', p_patch: { source: ' https://x.example/a ' } }),
        ],
      )[0]?.source,
    ).toBe('https://x.example/a')
    const lines = applyPendingMealLines(
      [],
      [
        entry('food.add_meal_line', {
          p_id: 'b',
          p_meal: 'm',
          p_fields: { position: 'b', text: 'Milk' },
        }),
        entry('food.add_meal_line', {
          p_id: 'a',
          p_meal: 'm',
          p_fields: { position: 'a', pantry_id: 'p1', qty: 1, unit: 'cup' },
        }),
        entry('food.update_meal_line', { p_id: 'b', p_patch: { qty: 2 } }),
        entry('food.merge_pantry', { p_keep: 'p2', p_merge: 'p1' }),
      ],
    )
    expect(lines.map((l) => [l.id, l.pantry_id ?? l.text, l.qty])).toEqual([
      ['a', 'p2', 1],
      ['b', 'Milk', 2],
    ])
    expect(
      applyPendingMealLines(lines, [entry('food.remove_meal_line', { p_id: 'a' })]),
    ).toHaveLength(1)
  })

  it('uses its Variation, and another once changed', () => {
    const uses = (links: { from_item: string; to_item: string; link_type: string }[]) =>
      links.filter((l) => l.link_type === 'uses').map((l) => [l.from_item, l.to_item])
    expect(uses(applyPendingLinks([], [plan]))).toEqual([['m', 'v']])
    expect(
      uses(
        applyPendingLinks(
          [],
          [plan, entry('food.set_meal_variation', { p_meal: 'm', p_variation: 'v2' })],
        ),
      ),
    ).toEqual([['m', 'v2']])
  })
})
