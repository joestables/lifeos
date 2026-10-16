import { addDays } from '@lifeos/recurrence'
import type { ItemRow } from '@/data/types'
import { shortDate, fromIsoDay, zonedInstant, zonedParts } from './dates'

/**
 * An Event's times as its fields show them, on the clock in my home
 * timezone: a start and an end day and time, or all day from one day to
 * another (both included).
 */
export interface EventTimes {
  allDay: boolean
  startDay: string
  /** "13:00"; empty when all day. */
  startTime: string
  endDay: string
  endTime: string
}

type Times = Pick<ItemRow, 'starts_at' | 'ends_at' | 'all_day'>

/** Minutes since 1970 on the wall clock, for working out lengths and moving times. */
const wallMinutes = (day: string, time: string) => {
  const [y, m, d] = day.split('-').map(Number)
  const [h, min] = (time || '00:00').split(':').map(Number)
  return Date.UTC(y!, m! - 1, d, h, min) / 60_000
}

const fromWallMinutes = (minutes: number) => {
  const iso = new Date(minutes * 60_000).toISOString()
  return { day: iso.slice(0, 10), time: iso.slice(11, 16) }
}

/** An Event's times from what is stored; null before it has a start. */
export function eventTimes(item: Times, timezone: string): EventTimes | null {
  if (!item.starts_at) return null
  if (item.all_day) {
    // Kept as dates, midnight UTC, the end the day after the last (EVT-001 3).
    const startDay = item.starts_at.slice(0, 10)
    const after = item.ends_at?.slice(0, 10)
    const endDay = after && after > startDay ? addDays(after, -1) : startDay
    return { allDay: true, startDay, startTime: '', endDay, endTime: '' }
  }
  const start = zonedParts(item.starts_at, timezone)
  const end = item.ends_at
    ? zonedParts(item.ends_at, timezone)
    : fromWallMinutes(wallMinutes(start.day, start.time) + 60)
  return {
    allDay: false,
    startDay: start.day,
    startTime: start.time,
    endDay: end.day,
    endTime: end.time,
  }
}

/** What is stored for an Event's times. */
export function eventFields(
  t: EventTimes,
  timezone: string,
): { starts_at: string; ends_at: string; all_day: boolean } {
  if (t.allDay)
    return {
      starts_at: `${t.startDay}T00:00:00.000Z`,
      ends_at: `${addDays(t.endDay, 1)}T00:00:00.000Z`,
      all_day: true,
    }
  return {
    starts_at: zonedInstant(t.startDay, t.startTime, timezone),
    ends_at: zonedInstant(t.endDay, t.endTime, timezone),
    all_day: false,
  }
}

/** Whether the end is after the start (EVT-001 2); all day, on or after its first day. */
export function endsAfterStart(t: EventTimes): boolean {
  if (t.allDay) return t.endDay >= t.startDay
  return wallMinutes(t.endDay, t.endTime) > wallMinutes(t.startDay, t.startTime)
}

/**
 * A new start, the end moving with it so the Event keeps its length: a new
 * Event's end stays an hour after its start until I change it (EVT-001 2).
 */
export function moveStart(t: EventTimes, day: string, time: string = t.startTime): EventTimes {
  if (t.allDay) {
    const span = wallMinutes(t.endDay, '') - wallMinutes(t.startDay, '')
    return { ...t, startDay: day, endDay: fromWallMinutes(wallMinutes(day, '') + span).day }
  }
  const length = wallMinutes(t.endDay, t.endTime) - wallMinutes(t.startDay, t.startTime)
  const end = fromWallMinutes(wallMinutes(day, time) + Math.max(length, 0))
  return { ...t, startDay: day, startTime: time, endDay: end.day, endTime: end.time }
}

/** All day on, keeping its days; off, 09:00 to 10:00 on them. */
export function setAllDay(t: EventTimes, allDay: boolean): EventTimes {
  if (allDay) return { ...t, allDay, startTime: '', endTime: '' }
  return { ...t, allDay, startTime: '09:00', endTime: '10:00' }
}

/**
 * A new Event's times on a day (PLN-006 2): from the next whole hour when it
 * is today, else at my default time, an hour long.
 */
export function newEventTimes(
  day: string,
  today: string,
  now: Date = new Date(),
  defaultTime: string = '09:00',
): EventTimes {
  const start =
    day === today ? `${String(Math.min(now.getHours() + 1, 23)).padStart(2, '0')}:00` : defaultTime
  const end = fromWallMinutes(wallMinutes(day, start) + 60)
  return { allDay: false, startDay: day, startTime: start, endDay: end.day, endTime: end.time }
}

/**
 * When an Event is, as a line says it: "Sat 17 Oct 13:00–15:00", "Sat 17 Oct,
 * all day", "Thu 15 Oct – Sat 17 Oct".
 */
export function eventWhen(t: EventTimes): string {
  const day = (d: string) => shortDate(fromIsoDay(d))
  if (t.allDay)
    return t.endDay === t.startDay
      ? `${day(t.startDay)}, all day`
      : `${day(t.startDay)} – ${day(t.endDay)}`
  if (t.endDay === t.startDay) return `${day(t.startDay)} ${t.startTime}–${t.endTime}`
  return `${day(t.startDay)} ${t.startTime} – ${day(t.endDay)} ${t.endTime}`
}

/**
 * A Task's times as an Event's, as the server maps them (EVT-005 1): its
 * do-on date and time, an hour long; with no time, all day.
 */
export function taskAsEvent(
  task: Pick<ItemRow, 'do_on' | 'do_at'>,
  timezone: string,
): { starts_at: string; ends_at: string; all_day: boolean } | null {
  if (!task.do_on) return null
  if (!task.do_at)
    return eventFields(
      { allDay: true, startDay: task.do_on, startTime: '', endDay: task.do_on, endTime: '' },
      timezone,
    )
  return eventFields(
    moveStart(newEventTimes(task.do_on, ''), task.do_on, task.do_at.slice(0, 5)),
    timezone,
  )
}

/** An Event's start as a Task's do-on date and time (EVT-005 2). */
export function eventAsTask(
  event: Times,
  timezone: string,
): { do_on: string; do_at: string | null } | null {
  const t = eventTimes(event, timezone)
  if (!t) return null
  return { do_on: t.startDay, do_at: t.allDay ? null : `${t.startTime}:00` }
}
