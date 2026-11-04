import { describe, expect, it } from 'vitest'
import { readinessColour, readinessPosition } from './readiness'

describe('the readiness scale (GYM-016 1)', () => {
  it('puts 50 % a third of the way along, so 50–100 % spans most of it', () => {
    expect(readinessPosition(0)).toBe(0)
    expect(readinessPosition(50)).toBeCloseTo(100 / 3)
    expect(readinessPosition(62.5)).toBeCloseTo(50)
    expect(readinessPosition(100)).toBe(100)
    expect(readinessPosition(-5)).toBe(0)
    expect(readinessPosition(120)).toBe(100)
  })

  it('mixes red, the scale’s amber and green', () => {
    expect(readinessColour(0)).toBe(
      'color-mix(in oklch, var(--readiness-mid) 0%, var(--destructive))',
    )
    expect(readinessColour(50)).toBe(
      'color-mix(in oklch, var(--readiness-mid) 66.67%, var(--destructive))',
    )
    expect(readinessColour(62.5)).toBe(
      'color-mix(in oklch, var(--readiness-mid) 100%, var(--destructive))',
    )
    expect(readinessColour(100)).toBe(
      'color-mix(in oklch, var(--success) 100%, var(--readiness-mid))',
    )
  })
})
