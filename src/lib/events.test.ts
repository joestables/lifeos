import { describe, expect, it } from 'vitest'
import {
  endsAfterStart,
  eventAsTask,
  eventFields,
  eventTimes,
  eventWhen,
  moveStart,
  newEventTimes,
  setAllDay,
  taskAsEvent,
} from './events'

const TZ = 'Europe/London'

describe('Event times', () => {
  it('EVT-001: a timed Event is on the clock in my home timezone', () => {
    const t = eventTimes(
      { starts_at: '2026-10-17T12:00:00Z', ends_at: '2026-10-17T14:00:00Z', all_day: false },
      TZ,
    )
    expect(t).toEqual({
      allDay: false,
      startDay: '2026-10-17',
      startTime: '13:00',
      endDay: '2026-10-17',
      endTime: '15:00',
    })
    expect(eventFields(t!, TZ)).toEqual({
      starts_at: '2026-10-17T12:00:00.000Z',
      ends_at: '2026-10-17T14:00:00.000Z',
      all_day: false,
    })
  })

  it('EVT-001 3: Saturday to Monday all day is kept as those dates, the same anywhere', () => {
    const t = {
      allDay: true,
      startDay: '2026-10-17',
      startTime: '',
      endDay: '2026-10-19',
      endTime: '',
    }
    const stored = eventFields(t, TZ)
    expect(stored).toEqual({
      starts_at: '2026-10-17T00:00:00.000Z',
      ends_at: '2026-10-20T00:00:00.000Z',
      all_day: true,
    })
    expect(eventTimes(stored, 'America/New_York')).toEqual(t)
  })

  it('EVT-001 2: the end stays an hour after the start until I change it; before it is refused', () => {
    const t = newEventTimes('2026-10-17', '2026-10-16')
    expect(t).toMatchObject({ startTime: '09:00', endTime: '10:00' })
    expect(moveStart(t, '2026-10-18', '19:30')).toMatchObject({
      startDay: '2026-10-18',
      startTime: '19:30',
      endDay: '2026-10-18',
      endTime: '20:30',
    })
    expect(moveStart(t, '2026-10-18', '23:30')).toMatchObject({
      endDay: '2026-10-19',
      endTime: '00:30',
    })
    expect(endsAfterStart({ ...t, endTime: '08:00' })).toBe(false)
    expect(endsAfterStart(t)).toBe(true)
  })

  it('a new Event today starts at the next whole hour on my home clock', () => {
    const t = newEventTimes('2026-10-16', '2026-10-16', new Date('2026-10-16T13:20:00Z'))
    expect(t).toMatchObject({ startTime: '15:00', endTime: '16:00' })
    // Late in the evening, the next quarter hour.
    expect(
      newEventTimes('2026-10-16', '2026-10-16', new Date('2026-10-16T22:20:00Z')),
    ).toMatchObject({ startTime: '23:30', endDay: '2026-10-17', endTime: '00:30' })
  })

  it('all day keeps its days; off again, it is 09:00 to 10:00', () => {
    const t = newEventTimes('2026-10-17', '2026-10-16')
    const allDay = setAllDay(t, true)
    expect(allDay).toMatchObject({ allDay: true, startDay: '2026-10-17', endDay: '2026-10-17' })
    expect(setAllDay(allDay, false)).toMatchObject({ startTime: '09:00', endTime: '10:00' })
    expect(moveStart({ ...allDay, endDay: '2026-10-19' }, '2026-10-24').endDay).toBe('2026-10-26')
  })

  it('says when it is', () => {
    expect(
      eventWhen({
        allDay: false,
        startDay: '2026-10-17',
        startTime: '13:00',
        endDay: '2026-10-17',
        endTime: '15:00',
      }),
    ).toBe('Sat 17 Oct 13:00–15:00')
    expect(
      eventWhen({
        allDay: true,
        startDay: '2026-10-15',
        startTime: '',
        endDay: '2026-10-17',
        endTime: '',
      }),
    ).toBe('Thu 15 Oct – Sat 17 Oct')
  })
})

describe('Task <-> Event', () => {
  it('EVT-005 1: Friday at 19:00 becomes 19:00 to 20:00; with no time, all day', () => {
    expect(taskAsEvent({ do_on: '2026-10-16', do_at: '19:00:00' }, TZ)).toEqual({
      starts_at: '2026-10-16T18:00:00.000Z',
      ends_at: '2026-10-16T19:00:00.000Z',
      all_day: false,
    })
    expect(taskAsEvent({ do_on: '2026-10-16', do_at: null }, TZ)).toEqual({
      starts_at: '2026-10-16T00:00:00.000Z',
      ends_at: '2026-10-17T00:00:00.000Z',
      all_day: true,
    })
    expect(taskAsEvent({ do_on: null, do_at: null }, TZ)).toBeNull()
  })

  it('EVT-005 2: an Event start becomes the do-on date and time', () => {
    expect(
      eventAsTask(
        { starts_at: '2026-10-16T18:00:00Z', ends_at: '2026-10-16T19:00:00Z', all_day: false },
        TZ,
      ),
    ).toEqual({ do_on: '2026-10-16', do_at: '19:00:00' })
    expect(
      eventAsTask(
        { starts_at: '2026-10-16T00:00:00Z', ends_at: '2026-10-17T00:00:00Z', all_day: true },
        TZ,
      ),
    ).toEqual({ do_on: '2026-10-16', do_at: null })
  })
})
