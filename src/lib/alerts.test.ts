import { describe, expect, it } from 'vitest'
import {
  inAnHour,
  reminderAlertFields,
  reminderChoice,
  byFiring,
  choiceFiresAt,
  defaultAlert,
  alertChoice,
  alertFields,
  alertSays,
  alertTime,
  sameChoice,
} from './alerts'

const NOW = new Date(2026, 9, 12, 9, 0)
const r = (fields: Record<string, unknown>) => ({
  anchor: null,
  offset_days: 0,
  fixed_at: null,
  snoozed_until: null,
  fires_at: null,
  ...fields,
})

describe('REM-003: an Alert in words', () => {
  it.each([
    [{ anchor: 'do_on' }, 'On the day'],
    [{ anchor: 'do_on', offset_days: -1 }, '1 day before'],
    [{ anchor: 'do_on', offset_days: -3 }, '3 days before'],
    [{ anchor: 'due_on' }, 'On the due date'],
    [{ anchor: 'due_on', offset_days: -2 }, "2 days before it's due"],
    [{ fixed_at: '2026-10-16T08:00:00Z' }, 'At a set time'],
    [{ anchor: 'do_on', snoozed_until: '2026-10-12T09:30:00Z' }, 'Snoozed'],
  ])('%o says "%s"', (fields, says) => {
    expect(alertSays(r(fields) as never, NOW)).toBe(says)
  })

  it('says when it fires, and orders soonest first', () => {
    expect(alertTime(r({ fires_at: '2026-10-12T17:30:00Z' }), NOW)).toBe('Today 17:30')
    expect(alertTime(r({}), NOW)).toBeNull()
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

describe('an Alert not yet saved (TSK-001 4)', () => {
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
      alertFields({ kind: 'fixed', day: '2026-10-12', time: '19:00' }, 'Europe/London'),
    ).toEqual({
      anchor: null,
      offset_days: 0,
      at_time: null,
      offset_minutes: 0,
      fixed_at: '2026-10-12T18:00:00.000Z',
      alarm: false,
    })
  })

  it('REM-011 1: an Alarm is kept with it, and read back', () => {
    const fields = alertFields(
      { kind: 'fixed', day: '2026-10-12', time: '07:00', alarm: true },
      'Europe/London',
    )
    expect(fields.alarm).toBe(true)
    expect(
      alertChoice(
        {
          ...fields,
          anchor: null,
          offset_days: 0,
          offset_minutes: 0,
          at_time: null,
          fixed_at: fields.fixed_at!,
        },
        '09:00',
        'Europe/London',
      ),
    ).toEqual({ kind: 'fixed', day: '2026-10-12', time: '07:00', alarm: true })
  })

  it('EVT-003 3: before an Event starts, or on a day before it at a time', () => {
    expect(alertFields({ kind: 'before', minutes: 60, time: '09:00' }, 'Europe/London')).toEqual({
      anchor: 'starts_at',
      offset_days: 0,
      at_time: null,
      offset_minutes: -60,
      fixed_at: null,
      alarm: false,
    })
    expect(
      alertFields({ kind: 'starts_at', daysBefore: 1, time: '18:00' }, 'Europe/London'),
    ).toEqual({
      anchor: 'starts_at',
      offset_days: -1,
      at_time: '18:00',
      offset_minutes: 0,
      fixed_at: null,
      alarm: false,
    })
    const r = {
      anchor: 'starts_at',
      offset_days: 0,
      at_time: null,
      offset_minutes: -30,
      fixed_at: null,
      snoozed_until: null,
    }
    expect(alertSays(r)).toBe('30 minutes before')
    expect(alertSays({ ...r, offset_minutes: -60 })).toBe('1 hour before')
    expect(alertSays({ ...r, offset_days: -1, at_time: '18:00:00' })).toBe('1 day before')
    expect(alertChoice(r, '09:00', 'Europe/London')).toEqual({
      kind: 'before',
      minutes: 30,
      time: '09:00',
      alarm: false,
    })
    expect(
      choiceFiresAt(
        { kind: 'before', minutes: 30, time: '09:00' },
        { starts_at: '2026-10-17T12:00:00.000Z' },
        'Europe/London',
      ),
    ).toBe('2026-10-17T11:30:00.000Z')
    expect(
      choiceFiresAt(
        { kind: 'starts_at', daysBefore: 1, time: '18:00' },
        { start_day: '2026-10-17' },
        'Europe/London',
      ),
    ).toBe('2026-10-16T17:00:00.000Z')
  })
})

describe('the default a new Item is given (REM-002 1, EVT-003 1)', () => {
  const settings = { defaultAlertTime: '09:00', taskAlerts: true, eventAlerts: true }
  it('is a dated Task’s, on the day at its time, else my default time', () => {
    expect(
      defaultAlert({ type: 'task', do_on: '2026-11-10', do_at: '20:00:00' }, settings),
    ).toEqual({ kind: 'do_on', daysBefore: 0, time: '20:00' })
    expect(defaultAlert({ type: 'task', do_on: '2026-11-10', do_at: null }, settings)).toEqual({
      kind: 'do_on',
      daysBefore: 0,
      time: '09:00',
    })
    expect(defaultAlert({ type: 'task', do_on: null, do_at: null }, settings)).toBeNull()
  })
  it('is a timed Event’s, 30 minutes before; none all day', () => {
    const at = '2026-11-10T19:00:00.000Z'
    expect(defaultAlert({ type: 'event', starts_at: at, all_day: false }, settings)).toEqual({
      kind: 'before',
      minutes: 30,
      time: '09:00',
    })
    expect(defaultAlert({ type: 'event', starts_at: at, all_day: true }, settings)).toBeNull()
  })
  it('is none with that default off in Settings (REM-007 2)', () => {
    const off = { ...settings, taskAlerts: false, eventAlerts: false }
    expect(defaultAlert({ type: 'task', do_on: '2026-11-10', do_at: null }, off)).toBeNull()
    expect(
      defaultAlert({ type: 'event', starts_at: '2026-11-10T19:00:00Z', all_day: false }, off),
    ).toBeNull()
  })
  it('opened and saved unchanged, is still the default', () => {
    const d = { kind: 'do_on', daysBefore: 0, time: '20:00' } as const
    expect(sameChoice(d, { ...d })).toBe(true)
    expect(sameChoice(d, { ...d, time: '19:00' })).toBe(false)
    expect(sameChoice(d, { kind: 'due_on', daysBefore: 0, time: '20:00' })).toBe(false)
  })
})

describe('a Reminder’s Alerts (RMD-002, ADR-0065 2)', () => {
  it('keeps a date and time as days on from the Reminder’s day, at that time', () => {
    expect(
      reminderAlertFields(
        { kind: 'fixed', day: '2026-11-12', time: '09:00', alarm: true },
        '2026-11-10',
      ),
    ).toEqual({
      anchor: 'do_on',
      offset_days: 2,
      at_time: '09:00',
      offset_minutes: 0,
      fixed_at: null,
      alarm: true,
    })
  })

  it('shows one as a date and time in the Alert dialog', () => {
    expect(reminderChoice({ day: '2026-11-12', time: '09:00', alarm: false })).toEqual({
      kind: 'fixed',
      day: '2026-11-12',
      time: '09:00',
      alarm: false,
    })
  })

  it('starts a new one an hour from now, to the minute', () => {
    expect(inAnHour(new Date('2026-11-10T14:20:30Z'), 'Europe/London')).toEqual({
      day: '2026-11-10',
      time: '15:20',
    })
  })
})
