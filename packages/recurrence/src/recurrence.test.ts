import { describe, expect, it } from 'vitest'
import {
  afterCompletion,
  describeRule,
  formatRule,
  nextOccurrence,
  occurrences,
  parseRule,
  shortRule,
  todayIn,
  windowOf,
} from './index.ts'

// Monday 12 October 2026.
const MON = '2026-10-12'

describe('rules: read and written as RRULEs (ADR-0045)', () => {
  it('round-trips each repeat the app offers (TSK-008 1)', () => {
    for (const rule of [
      'FREQ=DAILY',
      'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
      'FREQ=WEEKLY;BYDAY=MO,TH',
      'FREQ=DAILY;INTERVAL=3',
      'FREQ=WEEKLY;INTERVAL=2;BYDAY=SA',
      'FREQ=MONTHLY;INTERVAL=6',
      'FREQ=MONTHLY;BYMONTHDAY=12',
      'FREQ=MONTHLY;BYDAY=1SA',
      'FREQ=MONTHLY;BYDAY=-1FR',
      'FREQ=YEARLY',
      'FREQ=WEEKLY;COUNT=5',
      'FREQ=DAILY;UNTIL=20270105',
    ])
      expect(formatRule(parseRule(rule))).toBe(rule)
  })

  it('orders weekdays from Monday', () => {
    expect(formatRule(parseRule('FREQ=WEEKLY;BYDAY=SU,WE,MO'))).toBe('FREQ=WEEKLY;BYDAY=MO,WE,SU')
  })

  it('refuses what it would otherwise silently drop', () => {
    expect(() => parseRule('')).toThrow()
    expect(() => parseRule('FREQ=HOURLY')).toThrow()
    expect(() => parseRule('FREQ=DAILY;BYHOUR=9')).toThrow()
    expect(() => parseRule('FREQ=WEEKLY;BYDAY=XX')).toThrow()
  })
})

describe('TSK-008: repeat on a schedule', () => {
  it('daily, from the start', () => {
    expect(occurrences('FREQ=DAILY', MON, MON, '2026-10-15')).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
    ])
  })

  it('every weekday', () => {
    expect(
      occurrences('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', '2026-10-15', MON, '2026-10-20'),
    ).toEqual(['2026-10-15', '2026-10-16', '2026-10-19', '2026-10-20'])
  })

  it('weekly on chosen days, never before the start', () => {
    // From a Wednesday: that week's Monday is before it.
    expect(occurrences('FREQ=WEEKLY;BYDAY=MO,FR', '2026-10-14', MON, '2026-10-26')).toEqual([
      '2026-10-16',
      '2026-10-19',
      '2026-10-23',
      '2026-10-26',
    ])
  })

  it('weekly with no day named is on the start’s day', () => {
    expect(occurrences('FREQ=WEEKLY', '2026-10-14', MON, '2026-10-28')).toEqual([
      '2026-10-14',
      '2026-10-21',
      '2026-10-28',
    ])
  })

  it('every N days, weeks and months', () => {
    expect(occurrences('FREQ=DAILY;INTERVAL=3', MON, MON, '2026-10-19')).toEqual([
      '2026-10-12',
      '2026-10-15',
      '2026-10-18',
    ])
    expect(occurrences('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO', MON, MON, '2026-11-09')).toEqual([
      '2026-10-12',
      '2026-10-26',
      '2026-11-09',
    ])
    expect(occurrences('FREQ=MONTHLY;INTERVAL=6', MON, MON, '2027-10-12')).toEqual([
      '2026-10-12',
      '2027-04-12',
      '2027-10-12',
    ])
  })

  it('monthly on a date skips a month without it, rather than sliding', () => {
    expect(occurrences('FREQ=MONTHLY', '2026-08-31', '2026-08-01', '2026-11-01')).toEqual([
      '2026-08-31',
      '2026-10-31',
    ])
  })

  it('monthly on the last day', () => {
    expect(
      occurrences('FREQ=MONTHLY;BYMONTHDAY=-1', '2027-01-31', '2027-01-01', '2027-04-30'),
    ).toEqual(['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30'])
  })

  it('monthly on the nth weekday: "first Saturday", "last Friday"', () => {
    expect(occurrences('FREQ=MONTHLY;BYDAY=1SA', MON, MON, '2027-01-31')).toEqual([
      '2026-11-07',
      '2026-12-05',
      '2027-01-02',
    ])
    expect(occurrences('FREQ=MONTHLY;BYDAY=-1FR', MON, MON, '2026-12-31')).toEqual([
      '2026-10-30',
      '2026-11-27',
      '2026-12-25',
    ])
  })

  it('a fifth weekday skips the months without one', () => {
    expect(occurrences('FREQ=MONTHLY;BYDAY=5TH', '2026-10-01', '2026-10-01', '2027-01-31')).toEqual(
      ['2026-10-29', '2026-12-31'],
    )
  })

  it('yearly, skipping 29 February in a common year', () => {
    expect(occurrences('FREQ=YEARLY', '2028-02-29', '2028-01-01', '2033-01-01')).toEqual([
      '2028-02-29',
      '2032-02-29',
    ])
  })

  it('ends after a count, or on a day', () => {
    expect(occurrences('FREQ=DAILY;COUNT=3', MON, MON, '2026-12-01')).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
    ])
    expect(occurrences('FREQ=DAILY;UNTIL=20261014', MON, MON, '2026-12-01')).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
    ])
  })

  it('3: Mondays stay Mondays either side of the clocks changing', () => {
    // UK clocks go back on Sunday 25 October 2026.
    expect(occurrences('FREQ=WEEKLY;BYDAY=MO', MON, MON, '2026-11-02')).toEqual([
      '2026-10-12',
      '2026-10-19',
      '2026-10-26',
      '2026-11-02',
    ])
  })

  it('the next occurrence, and none once it has ended', () => {
    expect(nextOccurrence('FREQ=DAILY', MON, MON)).toBe('2026-10-13')
    expect(nextOccurrence('FREQ=DAILY', MON, MON, true)).toBe('2026-10-12')
    expect(nextOccurrence('FREQ=DAILY;COUNT=2', MON, '2026-10-20')).toBeNull()
  })

  it('finds a daily series’ days years after its start', () => {
    expect(occurrences('FREQ=DAILY', '2010-01-01', '2026-10-12', '2026-10-13')).toEqual([
      '2026-10-12',
      '2026-10-13',
    ])
  })
})

describe('ADR-0045: the window a run makes', () => {
  it('4: twelve weeks ahead, and the one after', () => {
    const { days, until } = windowOf('FREQ=WEEKLY;BYDAY=MO', MON, null, MON)
    expect(days[0]).toBe(MON)
    expect(days).toHaveLength(14)
    expect(days.at(-2)).toBe('2027-01-04')
    expect(days.at(-1)).toBe('2027-01-11')
    expect(until).toBe('2027-01-11')
  })

  it('a yearly Task always has its next one made', () => {
    expect(windowOf('FREQ=YEARLY', MON, null, MON)).toEqual({
      days: ['2026-10-12', '2027-10-12'],
      until: '2027-10-12',
    })
    // The next night, nothing new.
    expect(windowOf('FREQ=YEARLY', MON, '2027-10-12', '2026-10-13').days).toEqual([])
  })

  it('a later run carries on from where the last stopped', () => {
    const first = windowOf('FREQ=DAILY', MON, null, MON)
    const next = windowOf('FREQ=DAILY', MON, first.until, '2026-10-14')
    expect(next.days[0]).toBe('2027-01-06')
    expect(new Set([...first.days, ...next.days]).size).toBe(first.days.length + next.days.length)
  })

  it('an ended rule makes nothing more', () => {
    expect(windowOf('FREQ=DAILY;COUNT=2', MON, null, MON)).toEqual({
      days: ['2026-10-12', '2026-10-13'],
      until: '2027-01-04',
    })
  })
})

describe('TSK-009: repeat after completion', () => {
  it('1: three months after 10 October is 10 January', () => {
    expect(afterCompletion('FREQ=MONTHLY;INTERVAL=3', '2026-10-10')).toBe('2027-01-10')
  })

  it('days, weeks and years; a month after 31 January is the end of February', () => {
    expect(afterCompletion('FREQ=DAILY;INTERVAL=10', '2026-10-25')).toBe('2026-11-04')
    expect(afterCompletion('FREQ=WEEKLY;INTERVAL=2', MON)).toBe('2026-10-26')
    expect(afterCompletion('FREQ=YEARLY', '2028-02-29')).toBe('2029-02-28')
    expect(afterCompletion('FREQ=MONTHLY', '2027-01-31')).toBe('2027-02-28')
  })
})

describe('the repeat in words', () => {
  it.each([
    ['FREQ=DAILY', 'Every day', 'Daily'],
    ['FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', 'Every weekday', 'Weekdays'],
    ['FREQ=WEEKLY;BYDAY=MO', 'Every Monday', 'Weekly'],
    ['FREQ=WEEKLY;BYDAY=MO,TH', 'Weekly on Mon, Thu', 'Weekly'],
    ['FREQ=WEEKLY;INTERVAL=2;BYDAY=SA', 'Every 2 weeks on Sat', 'Every 2 weeks'],
    ['FREQ=DAILY;INTERVAL=3', 'Every 3 days', 'Every 3 days'],
    ['FREQ=MONTHLY', 'Monthly on day 12', 'Monthly'],
    ['FREQ=MONTHLY;BYDAY=1SA', 'Monthly on the first Saturday', 'Monthly'],
    ['FREQ=MONTHLY;BYDAY=-1FR', 'Monthly on the last Friday', 'Monthly'],
    ['FREQ=MONTHLY;BYMONTHDAY=-1', 'Monthly on the last day', 'Monthly'],
    ['FREQ=YEARLY', 'Yearly on 12 Oct', 'Yearly'],
    ['FREQ=DAILY;COUNT=4', 'Every day, 4 times', 'Daily'],
    ['FREQ=DAILY;UNTIL=20290105', 'Every day, until 5 Jan 2029', 'Daily'],
  ])('%s is "%s"', (rule, long, short) => {
    expect(describeRule(rule, MON)).toBe(long)
    expect(shortRule(rule)).toBe(short)
  })

  it('after completion', () => {
    expect(describeRule('FREQ=MONTHLY;INTERVAL=3', MON, 'after_completion')).toBe(
      "3 months after it's done",
    )
    expect(shortRule('FREQ=WEEKLY', 'after_completion')).toBe('1 week after')
  })
})

describe('today in the series’ timezone', () => {
  it('is the local day, not UTC’s', () => {
    // 23:30 UTC on 12 October is already the 13th in London (BST).
    expect(todayIn('Europe/London', new Date('2026-10-12T23:30:00Z'))).toBe('2026-10-13')
    expect(todayIn('Europe/London', new Date('2026-12-12T23:30:00Z'))).toBe('2026-12-12')
  })
})
