import { describe, expect, it } from 'vitest'
import {
  zonedParts,
  capturedWhen,
  dayName,
  dueWhen,
  reminderWhen,
  shortDate,
  sinceWhen,
  whenAgo,
  zonedInstant,
} from './dates'

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

  it('CAP-001: says a day as capture offers it', () => {
    expect(dayName('2026-10-11', now)).toBe('Today')
    expect(dayName('2026-10-12', now)).toBe('Tomorrow')
    expect(dayName('2026-10-16', now)).toBe('Fri')
    expect(dayName('2026-10-18', now)).toBe('Sun 18 Oct')
  })

  it('CAP-004: finds the instant of a time in my timezone, clock changes included', () => {
    expect(zonedInstant('2026-10-16', '18:00', 'Europe/London')).toBe('2026-10-16T17:00:00.000Z')
    expect(zonedInstant('2026-11-02', '09:00', 'Europe/London')).toBe('2026-11-02T09:00:00.000Z')
    // The morning the clocks go back (25 October 2026).
    expect(zonedInstant('2026-10-25', '09:00', 'Europe/London')).toBe('2026-10-25T09:00:00.000Z')
    expect(zonedInstant('2026-10-16', '18:00', 'America/New_York')).toBe('2026-10-16T22:00:00.000Z')
  })

  it('INB-001, INB-003: says when a Thought was captured, and when a Task is due', () => {
    expect(capturedWhen(new Date(2026, 9, 11, 8, 12).toISOString(), now)).toBe('08:12')
    expect(capturedWhen(new Date(2026, 9, 10, 20, 0).toISOString(), now)).toBe('Yesterday')
    expect(capturedWhen(new Date(2026, 9, 8, 9, 0).toISOString(), now)).toBe('Thu')
    expect(capturedWhen(new Date(2026, 9, 1, 9, 0).toISOString(), now)).toBe('Thu 1 Oct')
    expect(dueWhen('2026-10-10', now)).toBe('Due yesterday')
    expect(dueWhen('2026-10-11', now)).toBe('Due today')
    expect(dueWhen('2026-10-08', now)).toBe('Due Thu 8 Oct')
    expect(sinceWhen('2026-10-10', now)).toBe('Since yesterday')
    expect(sinceWhen('2026-10-08', now)).toBe('Since Thu')
    expect(sinceWhen('2026-10-02', now)).toBe('Since Fri 2 Oct')
    expect(reminderWhen(new Date(2026, 9, 13, 15, 0).toISOString(), now)).toBe('Tue 15:00')
  })
})

describe('a moment on the clock in my home timezone', () => {
  it('is its day and time there, whatever the device says', () => {
    expect(zonedParts('2026-10-12T18:00:00Z', 'Europe/London')).toEqual({
      day: '2026-10-12',
      time: '19:00',
    })
    expect(zonedParts('2026-10-12T23:30:00Z', 'America/New_York')).toEqual({
      day: '2026-10-12',
      time: '19:30',
    })
  })
})
