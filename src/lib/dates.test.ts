import { describe, expect, it } from 'vitest'
import { shortDate, whenAgo } from './dates'

describe('dates as people read them (patterns.md#copy)', () => {
  const now = new Date(2026, 9, 11, 16, 30)

  it('says a date as "Fri 9 Oct"', () => {
    expect(shortDate(new Date(2026, 9, 9))).toBe('Fri 9 Oct')
  })

  it('ITM-003: says when something was deleted', () => {
    expect(whenAgo(new Date(2026, 9, 11, 16, 30, 20).toISOString(), now)).toBe('Just now')
    expect(whenAgo(new Date(2026, 9, 11, 16, 20).toISOString(), now)).toBe('10 min ago')
    expect(whenAgo(new Date(2026, 9, 11, 9, 5).toISOString(), now)).toBe('Today 09:05')
    expect(whenAgo(new Date(2026, 9, 10, 23, 0).toISOString(), now)).toBe('Yesterday')
    expect(whenAgo(new Date(2026, 9, 8, 12, 0).toISOString(), now)).toBe('Thu 8 Oct')
  })
})
