import { describe, expect, it } from 'vitest'
import {
  applyPendingCooks,
  applyPendingLines,
  applyPendingRecipes,
  applyPendingSteps,
  applyPendingVariations,
  type Line,
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
