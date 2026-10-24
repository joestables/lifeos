import { describe, expect, it } from 'vitest'
import { extraOffers, mealLabel, shopRows, type Line } from './shopping'

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
const meals = new Map([
  ['m1', 'Chilli Thu'],
  ['m2', 'Risotto Sun'],
])

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
  const groups = shopRows(lines, pantry, new Set(['salt']), (m) => meals.get(m))

  it('shows one row per ingredient, totalled, with the Meals it is for and Extra', () => {
    const beef = groups.find((g) => g.aisle === 'protein')!.rows[0]!
    expect(beef).toMatchObject({ name: 'Beef mince', amount: '1.5 kg', meta: 'Chilli Thu, Extra' })
    expect(beef.ids).toEqual(['a', 'b'])
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
    { space_id: 'mum', pantry_id: 'tea', kind: 'staple', needed: true },
    { space_id: 'me', pantry_id: 'oats', kind: 'staple', needed: false },
  ]
  it('offers each Space’s needed then Essentials, the shop’s own first; staples the Meals use', () => {
    const { offers, staplesUsed } = extraOffers(
      kept,
      ['me', 'home', 'mum'],
      'home',
      new Set(['cumin', 'tea']),
    )
    expect(offers.map((o) => o.space)).toEqual(['home', 'mum'])
    expect(offers[0]!.needed.map((n) => n.pantry_id)).toEqual(['salt', 'milk'])
    expect(offers[0]!.essentials).toEqual(['bread'])
    expect(staplesUsed).toEqual(['cumin'])
  })
})

describe('a line’s Meal by name and day', () => {
  it('names the day', () => {
    expect(mealLabel({ title: 'Katsu curry', do_on: '2026-10-29' })).toBe('Katsu curry Thu')
    expect(mealLabel({ title: 'Katsu curry', do_on: null })).toBe('Katsu curry')
  })
})
