import { describe, expect, it } from 'vitest'
import { axisStep } from './axis-step'

describe('axisStep', () => {
  it('steps in round multiples of the increment', () => {
    // Joe's bench: 70 to 75 kg on a 2.5 kg barbell was 70, 72, 74, 76.
    expect(axisStep(5, 2.5)).toBe(2.5)
    expect(axisStep(17.5, 2.5)).toBe(5)
    expect(axisStep(30, 2.5)).toBe(10)
    expect(axisStep(70, 2.5)).toBe(20)
    expect(axisStep(1, 0.625)).toBe(0.625)
    expect(axisStep(6, 0.625)).toBe(2.5)
    expect(axisStep(6, 1)).toBe(2)
    expect(axisStep(0, 2.5)).toBe(2.5)
  })

  it('steps in round numbers without one', () => {
    expect(axisStep(5)).toBe(2)
    expect(axisStep(40)).toBe(10)
    expect(axisStep(0)).toBe(1)
  })
})
