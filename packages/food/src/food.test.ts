import { describe, expect, it } from 'vitest'
import {
  findTimer,
  formatAmount,
  formatTimer,
  inBase,
  parseLine,
  parseNumber,
  roundFor,
  scale,
  total,
  type Amount,
} from './index.ts'

describe('reading a typed line (RCP-007 1, 3; ADR-0053)', () => {
  it.each([
    ['200 g chorizo', { qty: 200, qtyMax: null, approx: false, unit: 'g', name: 'Chorizo' }],
    ['200g chorizo', { qty: 200, qtyMax: null, approx: false, unit: 'g', name: 'Chorizo' }],
    ['1-2 tsp honey', { qty: 1, qtyMax: 2, approx: false, unit: 'tsp', name: 'Honey' }],
    ['1–2 tbsp soy sauce', { qty: 1, qtyMax: 2, approx: false, unit: 'tbsp', name: 'Soy sauce' }],
    ['~5 g salt', { qty: 5, qtyMax: null, approx: true, unit: 'g', name: 'Salt' }],
    ['2 onions', { qty: 2, qtyMax: null, approx: false, unit: null, name: 'Onions' }],
    ['½ lemon', { qty: 0.5, qtyMax: null, approx: false, unit: null, name: 'Lemon' }],
    ['1½ tbsp oil', { qty: 1.5, qtyMax: null, approx: false, unit: 'tbsp', name: 'Oil' }],
    ['1 1/2 l stock', { qty: 1.5, qtyMax: null, approx: false, unit: 'l', name: 'Stock' }],
    ['½ cup oats', { qty: 0.5, qtyMax: null, approx: false, unit: 'cup', name: 'Oats' }],
    [
      '600 ml of chicken stock',
      { qty: 600, qtyMax: null, approx: false, unit: 'ml', name: 'Chicken stock' },
    ],
    [
      '2 tablespoons curry powder',
      { qty: 2, qtyMax: null, approx: false, unit: 'tbsp', name: 'Curry powder' },
    ],
    ['salt', { qty: null, qtyMax: null, approx: false, unit: null, name: 'Salt' }],
    [
      '  pinch of  shichimi ',
      { qty: null, qtyMax: null, approx: false, unit: null, name: 'Pinch of shichimi' },
    ],
  ])('%s', (typed, parsed) => {
    expect(parseLine(typed)).toEqual(parsed)
  })

  it('reads numbers as people write them', () => {
    expect(parseNumber('1,5')).toBe(1.5)
    expect(parseNumber('3/4')).toBe(0.75)
    expect(parseNumber('¼')).toBe(0.25)
    expect(parseNumber('x')).toBeNull()
  })
})

describe('scaling and showing amounts (RCP-011 2; ADR-0053)', () => {
  const honey = { qty: 1, qtyMax: 2, approx: false, unit: 'tbsp' as const }

  it('scales both ends of a range', () => {
    expect(scale(honey, 1.5)).toEqual({ ...honey, qty: 1.5, qtyMax: 3 })
    expect(formatAmount(scale(honey, 1.5))).toBe('1.5–3 tbsp')
  })

  it('leaves an amount-less line alone', () => {
    const salt = { qty: null, qtyMax: null, approx: false, unit: null }
    expect(scale(salt, 2)).toBe(salt)
    expect(formatAmount(salt)).toBe('')
  })

  it('rounds for display, never to nothing', () => {
    expect(roundFor('g', 33.4)).toBe(33)
    expect(roundFor('g', 151)).toBe(150)
    expect(roundFor('kg', 1.234)).toBe(1.23)
    expect(roundFor('tsp', 0.6)).toBe(0.5)
    expect(roundFor(null, 1.3)).toBe(1.5)
    expect(roundFor('g', 0.2)).toBe(1)
    expect(roundFor('tsp', 0.05)).toBe(0.25)
  })

  it('shows approximate amounts and counts', () => {
    expect(formatAmount({ qty: 5, qtyMax: null, approx: true, unit: 'g' })).toBe('~5 g')
    expect(formatAmount({ qty: 1.5, qtyMax: null, approx: false, unit: null })).toBe('1.5')
    expect(formatAmount({ qty: 1.5, qtyMax: null, approx: false, unit: 'kg' })).toBe('1.5 kg')
  })

  it('adds within a kind, the top of a range counting', () => {
    expect(inBase({ qty: 1, qtyMax: 2, approx: false, unit: 'tbsp' })).toEqual({
      kind: 'volume',
      value: 30,
    })
    expect(inBase({ qty: 1.5, qtyMax: null, approx: false, unit: 'kg' })).toEqual({
      kind: 'weight',
      value: 1500,
    })
    expect(inBase({ qty: 2, qtyMax: null, approx: false, unit: null })).toBeNull()
    // A cup is 250 ml (Joe, 23 October).
    expect(inBase({ qty: 1.5, qtyMax: null, approx: false, unit: 'cup' })).toEqual({
      kind: 'volume',
      value: 375,
    })
    expect(formatAmount({ qty: 0.75, qtyMax: null, approx: false, unit: 'cup' })).toBe('0.75 cup')
  })
})

describe('timers from a step (RCP-011 3; ADR-0056)', () => {
  it.each([
    ['Simmer for 20 minutes.', 1200, '20 minutes'],
    ['Air fry at 200°C for 12 minutes, turning halfway.', 720, '12 minutes'],
    ['Rest for 10-15 mins.', 600, '10-15 mins'],
    ['Bake for 1 hour.', 3600, '1 hour'],
    ['Braise for 1½ hours.', 5400, '1½ hours'],
    ['Roast for 1 hr 15 min.', 4500, '1 hr 15 min'],
    ['Microwave for 90 seconds.', 90, '90 seconds'],
  ])('%s', (step, seconds, text) => {
    expect(findTimer(step)).toEqual({ seconds, text })
  })

  it('offers nothing when no time is named', () => {
    expect(findTimer('Flatten the chicken to 1 cm.')).toBeNull()
    expect(findTimer('Add 3 small onions.')).toBeNull()
  })

  it('counts down as minutes and seconds', () => {
    expect(formatTimer(1200)).toBe('20:00')
    expect(formatTimer(522)).toBe('8:42')
    expect(formatTimer(3725)).toBe('1:02:05')
  })
})

describe('total (ADR-0053; SHP-002 3)', () => {
  const a = (
    qty: number | null,
    unit: Amount['unit'] = null,
    more: Partial<Amount> = {},
  ): Amount => ({
    qty,
    qtyMax: null,
    approx: false,
    unit,
    ...more,
  })
  it('adds units of one kind, in the larger unit once it reads better', () => {
    expect(total([a(500, 'g'), a(1, 'kg')])).toBe('1.5 kg')
    expect(total([a(200, 'g'), a(300, 'g')])).toBe('500 g')
    expect(total([a(2, 'tbsp'), a(1, 'tbsp')])).toBe('3 tbsp')
    expect(total([a(1, 'tbsp'), a(100, 'ml')])).toBe('115 ml')
  })
  it('keeps weight, volume and counts side by side', () => {
    expect(total([a(2), a(500, 'g'), a(100, 'ml')])).toBe('2 + 500 g + 100 ml')
  })
  it('counts a range as its top, and carries "~"', () => {
    expect(total([a(1, 'tbsp', { qtyMax: 2 }), a(1, 'tbsp')])).toBe('3 tbsp')
    expect(total([a(5, 'g', { approx: true }), a(5, 'g')])).toBe('~10 g')
  })
  it('shows "+" for an unmeasured line on a measured one, nothing for none measured', () => {
    expect(total([a(5, 'g'), a(null)])).toBe('5 g +')
    expect(total([a(null)])).toBe('')
  })
})
