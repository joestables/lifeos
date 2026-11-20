import { describe, expect, it } from 'vitest'
import { extraChoices, mealLabel, shopRows, shopTally, type Line } from './shopping'

const pantry = new Map([
  ['beef', { name: 'Beef mince', kind: 'ingredient', aisle: 'protein' }],
  ['onion', { name: 'Onions', kind: 'ingredient', aisle: 'fruit_veg' }],
  ['salt', { name: 'Salt', kind: 'ingredient', aisle: 'cupboard' }],
  ['bags', { name: 'Bin bags', kind: 'household', aisle: null }],
])
const line = (id: string, more: Partial<Line>): Line => ({
  id,
  pantry_id: null,
  text: null,
  heading: null,
  qty: null,
  qty_max: null,
  approx: false,
  unit: null,
  checked: false,
  meal_id: null,
  position: '',
  ...more,
})
describe('SHP-002 2, 3: a food shop’s All', () => {
  const lines = [
    line('a', { pantry_id: 'beef', qty: 500, unit: 'g', meal_id: 'm1' }),
    line('b', { pantry_id: 'beef', qty: 1, unit: 'kg' }),
    line('c', { pantry_id: 'onion', qty: 2, meal_id: 'm1', checked: true }),
    line('d', { pantry_id: 'onion', qty: 1, meal_id: 'm2', checked: true }),
    line('e', { pantry_id: 'salt', qty: 5, unit: 'g', meal_id: 'm1' }),
    line('f', { pantry_id: 'bags' }),
    line('g', { text: 'Scotch bonnet', qty: 1, meal_id: 'm1' }),
    line('h', { text: 'scotch  BONNET', qty: 1 }),
  ]
  const groups = shopRows(lines, pantry, new Set(['salt']))

  it('shows one row per ingredient, totalled, no Meals named under it', () => {
    const beef = groups.find((g) => g.aisle === 'protein')!.rows[0]!
    expect(beef).toMatchObject({ name: 'Beef mince', amount: '1.5 kg' })
    expect(beef).not.toHaveProperty('meta')
    expect(beef.ids).toEqual(['a', 'b'])
  })
  it('counts as All does: onion for two Meals once (Joe, 25 October)', () => {
    expect(shopTally(lines, pantry, new Set(['salt']))).toEqual({ done: 1, total: 4 })
  })
  it('groups by aisle, household items then Other last, and a typed name whatever its case', () => {
    expect(groups.map((g) => g.aisle)).toEqual(['fruit_veg', 'protein', 'household', 'other'])
    expect(groups.at(-1)!.rows[0]).toMatchObject({ amount: '2', ids: ['g', 'h'] })
  })
  it('leaves out the staples the Meals use (SHP-003 3)', () => {
    expect(groups.some((g) => g.rows.some((r) => r.name === 'Salt'))).toBe(false)
  })
  it('is ticked when every line under it is; a line I added alone has a menu', () => {
    expect(groups[0]!.rows[0]!.checked).toBe(true)
    expect(groups.find((g) => g.aisle === 'household')!.rows[0]!.own?.id).toBe('f')
  })
})

describe('SHP-003 3: what Extra offers', () => {
  const kept = [
    { space_id: 'home', pantry_id: 'salt', kind: 'staple', needed: true },
    { space_id: 'home', pantry_id: 'milk', kind: 'essential', needed: true },
    { space_id: 'home', pantry_id: 'bread', kind: 'essential', needed: false },
    { space_id: 'home', pantry_id: 'cumin', kind: 'staple', needed: false },
    { space_id: 'home', pantry_id: 'oil', kind: 'staple', needed: false },
    { space_id: 'mum', pantry_id: 'tea', kind: 'staple', needed: true },
    { space_id: 'mum', pantry_id: 'milk', kind: 'essential', needed: false },
    { space_id: 'me', pantry_id: 'oats', kind: 'essential', needed: true },
  ]
  const { staples, essentials } = extraChoices(kept, 'home', new Set(['cumin', 'tea']))

  it('offers the shop’s staples its Meals use and those out of stock, not other Spaces’', () => {
    expect(staples).toEqual([
      { pantry_id: 'salt', needed: true, used: false },
      { pantry_id: 'cumin', needed: false, used: true },
    ])
  })
  it('offers every Space’s Essentials once, Required only in the shop’s Space', () => {
    expect(essentials).toEqual([
      { pantry_id: 'milk', spaces: ['home', 'mum'], required: true },
      { pantry_id: 'bread', spaces: ['home'], required: false },
      { pantry_id: 'oats', spaces: ['me'], required: false },
    ])
  })
})

describe('a line’s Meal by name and day', () => {
  it('names the day', () => {
    expect(mealLabel({ title: 'Katsu curry', do_on: '2026-10-29' })).toBe('Katsu curry Thu')
    expect(mealLabel({ title: 'Katsu curry', do_on: null })).toBe('Katsu curry')
  })
})
