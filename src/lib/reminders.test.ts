import { describe, expect, it } from 'vitest'
import { byFiring, choiceFiresAt, reminderFields, reminderSays, reminderTime } from './reminders'

const NOW = new Date(2026, 9, 12, 9, 0)
const r = (fields: Record<string, unknown>) => ({
  anchor: null,
  offset_days: 0,
  fixed_at: null,
  snoozed_until: null,
  fires_at: null,
  ...fields,
})

describe('REM-003: a Reminder in words', () => {
  it.each([
    [{ anchor: 'do_on' }, 'On the day'],
    [{ anchor: 'do_on', offset_days: -1 }, '1 day before'],
    [{ anchor: 'do_on', offset_days: -3 }, '3 days before'],
    [{ anchor: 'due_on' }, 'On the due date'],
    [{ anchor: 'due_on', offset_days: -2 }, "2 days before it's due"],
    [{ fixed_at: '2026-10-16T08:00:00Z' }, 'At a set time'],
    [{ anchor: 'do_on', snoozed_until: '2026-10-12T09:30:00Z' }, 'Snoozed'],
  ])('%o says "%s"', (fields, says) => {
    expect(reminderSays(r(fields) as never, NOW)).toBe(says)
  })

  it('says when it fires, and orders soonest first', () => {
    expect(reminderTime(r({ fires_at: '2026-10-12T17:30:00Z' }), NOW)).toBe('Today 17:30')
    expect(reminderTime(r({}), NOW)).toBeNull()
    const list = [
      r({ fires_at: null }),
      r({ fires_at: '2026-10-13T08:00:00Z' }),
      r({ fires_at: '2026-10-12T08:00:00Z' }),
    ]
    expect(list.sort(byFiring).map((x) => x.fires_at)).toEqual([
      '2026-10-12T08:00:00Z',
      '2026-10-13T08:00:00Z',
      null,
    ])
  })
})

describe('a Reminder not yet saved (TSK-001 4)', () => {
  it('fires on its date, days before, at its time, in my timezone', () => {
    expect(
      choiceFiresAt(
        { kind: 'do_on', daysBefore: 1, time: '18:00' },
        { do_on: '2026-10-16', due_on: null },
        'Europe/London',
      ),
    ).toBe('2026-10-15T17:00:00.000Z')
    expect(
      choiceFiresAt(
        { kind: 'due_on', daysBefore: 0, time: '09:00' },
        { do_on: null, due_on: null },
        'Europe/London',
      ),
    ).toBeNull()
  })

  it('is saved as the server takes it', () => {
    expect(
      reminderFields({ kind: 'fixed', day: '2026-10-12', time: '19:00' }, 'Europe/London'),
    ).toEqual({
      anchor: null,
      offset_days: 0,
      at_time: null,
      fixed_at: '2026-10-12T18:00:00.000Z',
    })
  })
})
