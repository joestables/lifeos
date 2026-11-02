import { describe, expect, it } from 'vitest'
import { periodOf, periodWeeks } from './progression'

describe('Progression’s periods (GYM-014 1, GYM-015 2)', () => {
  const now = new Date(2026, 10, 1, 12).getTime()

  it('a period is whole weeks, the last ending now', () => {
    expect(periodWeeks(now, '1m')).toHaveLength(4)
    expect(periodWeeks(now, '3m')).toHaveLength(13)
    expect(periodWeeks(now, '1y')).toHaveLength(52)
    const weeks = periodWeeks(now, '1m')
    expect(now - weeks[0]!.start).toBe(28 * 86_400_000)
    expect(weeks.at(-1)!.label).toBe('26 Oct')
  })

  it('3 months to start, named in full', () => {
    expect(periodOf('3m').name).toBe('3 months')
  })
})
