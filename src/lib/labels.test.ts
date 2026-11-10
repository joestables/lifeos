import { describe, expect, it } from 'vitest'
import { labelMatcher } from './labels'

describe('Narrowing a page to Labels', () => {
  const itemLabels = [
    { item_id: 'insurance', label_id: 'car' },
    { item_id: 'insurance', label_id: 'home' },
    { item_id: 'bins', label_id: 'home' },
    { item_id: 'gift', label_id: 'family' },
  ]
  const shown = (chosen: string[]) =>
    ['insurance', 'bins', 'gift', 'gate'].filter(labelMatcher(new Set(chosen), itemLabels))

  it('NTE-002, NTE-005: with none chosen, shows everything', () => {
    expect(shown([])).toEqual(['insurance', 'bins', 'gift', 'gate'])
  })

  it('NTE-002, NTE-005: shows what has the Label', () => {
    expect(shown(['car'])).toEqual(['insurance'])
  })

  it('NTE-002, NTE-005: with two chosen, shows what has either', () => {
    expect(shown(['car', 'family'])).toEqual(['insurance', 'gift'])
  })
})
