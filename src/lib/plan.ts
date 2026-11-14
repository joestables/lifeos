import { addDays, daysBetween, weekdayOf } from '@lifeos/recurrence'
import { hasTrait, typeByKey } from '@lifeos/ontology'
import type { Alert, Item } from '@/data'
import { dueWhen, fromIsoDay, shortDate, zonedInstant, zonedParts } from './dates'

const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' })
const weekdayName = (d: Date) => weekday.format(d)
import { eventFields, eventTimes, moveStart } from './events'

/** The Monday of a day's week (PLN-001: the week starts on Monday). */
export const mondayOf = (day: string) => addDays(day, -weekdayOf(day))

/** A week's seven days, Monday first. */
export const weekOf = (day: string) => {
  const monday = mondayOf(day)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/** Whether a Type is planned on Plan: Schedulable (ADR-0029). */
export const isPlanned = (type: string) => {
  const t = typeByKey(type)
  return t !== undefined && hasTrait(t, 'schedulable')
}

/** An Item on Plan: the first and last day it is on, in my home timezone (ADR-0049). */
export interface Placed {
  item: Item
  first: string
  last: string
  /** Its time on the clock, for ordering a day; empty when all day or untimed. */
  time: string
  /** A Reminder's Alerts on its day (RMD-003 1), soonest first. */
  alerts?: AlertTime[]
}

/** An Alert as Plan places a Reminder: its day and time, an Alarm or not, and when it fires. */
export interface AlertTime {
  day: string
  time: string
  alarm: boolean
  at: number
}

/**
 * A Reminder's Alerts as days and times (RMD-003, ADR-0065 2): each on the
 * Reminder's day and its offset from it, at its time, worked out here so it
 * shows at once, offline too; a snoozed one, or one at a set time, where the
 * server says it fires.
 */
export function alertTimes(
  item: Pick<Item, 'do_on'>,
  alerts: readonly Pick<
    Alert,
    'anchor' | 'offset_days' | 'at_time' | 'fires_at' | 'snoozed_until' | 'alarm'
  >[],
  timezone: string,
  now: Date = new Date(),
): AlertTime[] {
  const out: AlertTime[] = []
  for (const a of alerts) {
    const snoozed = a.snoozed_until !== null && Date.parse(a.snoozed_until) > now.getTime()
    if (!snoozed && a.anchor === 'do_on' && item.do_on && a.at_time) {
      const day = addDays(item.do_on, a.offset_days)
      const time = a.at_time.slice(0, 5)
      out.push({ day, time, alarm: a.alarm, at: Date.parse(zonedInstant(day, time, timezone)) })
    } else if (a.fires_at) {
      const p = zonedParts(a.fires_at, timezone)
      out.push({ day: p.day, time: p.time, alarm: a.alarm, at: Date.parse(a.fires_at) })
    }
  }
  return out.sort((a, b) => a.at - b.at)
}

/**
 * Where an Item is on Plan (PLN-001): an Event from its start to its end, an
 * all-day one on its dates; else its do-on date, else its due date. Not a
 * Task with no date or in Someday, nor one cancelled or skipped.
 */
export function placeOf(item: Item, timezone: string): Placed | null {
  if (!isPlanned(item.type) || item.archived_at !== null) return null
  if (item.status === 'cancelled' || item.status === 'idea') return null
  if (item.starts_at) {
    const t = eventTimes(item, timezone)!
    if (t.allDay) return { item, first: t.startDay, last: t.endDay, time: '' }
    // An Event ending at midnight doesn't reach the next day.
    const end = item.ends_at
      ? zonedParts(new Date(Date.parse(item.ends_at) - 1).toISOString(), timezone).day
      : t.startDay
    return { item, first: t.startDay, last: end < t.startDay ? t.startDay : end, time: t.startTime }
  }
  const day = item.do_on ?? item.due_on
  if (!day) return null
  return { item, first: day, last: day, time: item.do_on ? (item.do_at?.slice(0, 5) ?? '') : '' }
}

/**
 * The Items on each day from `from` to `to` (PLN-001 2): on each day, all-day
 * and untimed first, then by time. Hidden Types are left out (PLN-004).
 */
export function planDays(
  items: readonly Item[],
  from: string,
  to: string,
  timezone: string,
  hidden: readonly string[] = [],
  /** A Reminder's Alerts: it is on each day one of them is (RMD-003 1). */
  alertsOf: (item: Item) => AlertTime[] = () => [],
): Map<string, Placed[]> {
  const days = new Map<string, Placed[]>()
  for (let d = from; d <= to; d = addDays(d, 1)) days.set(d, [])
  for (const item of items) {
    if (hidden.includes(item.type)) continue
    const times = item.type === 'reminder' && placeOf(item, timezone) ? alertsOf(item) : []
    if (times.length > 0) {
      for (const day of new Set(times.map((t) => t.day))) {
        if (day < from || day > to) continue
        const on = times.filter((t) => t.day === day)
        days.get(day)!.push({ item, first: day, last: day, time: on[0]!.time, alerts: on })
      }
      continue
    }
    const p = placeOf(item, timezone)
    if (!p || p.last < from || p.first > to) continue
    for (let d = p.first < from ? from : p.first; d <= p.last && d <= to; d = addDays(d, 1))
      days.get(d)!.push(p)
  }
  for (const [day, list] of days) list.sort(dayOrder(day))
  return days
}

/**
 * How a day orders its Items (PLN-001 2): all-day and untimed first, then by
 * time; an Event running on from an earlier day counts as all day there.
 */
export const dayOrder =
  (day: string) =>
  (a: Placed, b: Placed): number => {
    const at = (p: Placed) => (p.first < day ? '' : p.time)
    return (
      at(a).localeCompare(at(b)) ||
      // Meals in slot order, among the untimed (PLN-008 1).
      slotRank(a.item) - slotRank(b.item) ||
      (a.item.position ?? '').localeCompare(b.item.position ?? '') ||
      a.item.created_at.localeCompare(b.item.created_at) ||
      a.item.id.localeCompare(b.item.id)
    )
  }

const SLOT_ORDER = ['breakfast', 'lunch', 'dinner']
const slotRank = (item: Item) => (item.slot ? SLOT_ORDER.indexOf(item.slot) + 1 : 0)

/**
 * What a card says on a day (patterns.md#week): its time ("18:00", in a
 * day's list "12:30–13:15", "All day", "Until 15:00") and a detail (a
 * place, "Until Tue", "Due Fri").
 */
export function cardLine(
  p: Placed,
  day: string,
  timezone: string,
  { long = false, now = new Date() }: { long?: boolean; now?: Date } = {},
): { time?: string; detail?: string } {
  const { item } = p
  // A Reminder: its Alerts' times that day (RMD-003 1).
  if (p.alerts) return { time: p.alerts.map((a) => a.time).join(', ') }
  if (item.starts_at) {
    const t = eventTimes(item, timezone)!
    const place = item.place?.trim() || undefined
    // On its first day, an Event over several says when it ends.
    const last = fromIsoDay(p.last)
    const until =
      day === p.first && p.last > day
        ? `Until ${daysBetween(day, p.last) < 7 ? weekdayName(last) : shortDate(last)}`
        : undefined
    // A day in the middle, or the last of one that runs to midnight, is all day.
    if (t.allDay || (p.first < day && (p.last > day || t.endDay > day)))
      return { time: 'All day', detail: until ?? place }
    if (p.first < day) return { time: `Until ${t.endTime}`, detail: place }
    const time = long && p.last === day ? `${t.startTime}–${t.endTime}` : t.startTime
    return { time, detail: until ?? place }
  }
  // A Meal's slot stands where a time would (PLN-008 1).
  if (item.slot) return { time: item.slot[0]!.toUpperCase() + item.slot.slice(1) }
  const due = item.due_on && (item.do_on !== null || item.due_on === day)
  return {
    time: item.do_on && item.do_at ? item.do_at.slice(0, 5) : undefined,
    detail: due ? dueWhen(item.due_on!, now) : undefined,
  }
}

/**
 * Whether a card has gone by: an Event that has ended; a Reminder whose
 * Alerts that day have all gone off (RMD-003 2). A done Item is struck
 * through, not past (PLN-001 6, Joe, 14 November); a Meal on a day gone by
 * is faded where Week lists it.
 */
export function isPast(item: Item, now: Date = new Date(), placed?: Placed): boolean {
  if (placed?.alerts) return placed.alerts.every((a) => a.at <= now.getTime())
  return item.ends_at !== null && Date.parse(item.ends_at) <= now.getTime()
}

/**
 * Moving an Item from one day on Plan to another (PLN-007): a Task's do-on
 * date, keeping its time and due date; an Event's start, keeping its time
 * and length. Null for what can't move.
 */
export function moveTo(
  item: Item,
  from: string,
  to: string,
  timezone: string,
): Partial<Pick<Item, 'do_on' | 'starts_at' | 'ends_at' | 'all_day'>> | null {
  if (from === to) return null
  if (item.starts_at) {
    const t = eventTimes(item, timezone)!
    return eventFields(moveStart(t, addDays(t.startDay, daysBetween(from, to))), timezone)
  }
  // A Meal keeps its slot; a Shopping list moves to the day (PLN-008 5).
  if (item.type === 'task' || item.type === 'meal' || item.type === 'shopping_list')
    return { do_on: to }
  // A Reminder's day moves by as many days, its Alerts with it (RMD-003 3).
  if (item.type === 'reminder' && item.do_on)
    return { do_on: addDays(item.do_on, daysBetween(from, to)) }
  return null
}

const month = new Intl.DateTimeFormat('en-GB', { month: 'long' })
const longWeekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long' })
const shortMonth = new Intl.DateTimeFormat('en-GB', { month: 'short' })

/**
 * A week as Plan's toolbar says it: "12 – 18 October", "28 September – 4
 * October", or `short`, "28 Sept – 4 Oct".
 */
export function weekTitle(monday: string, short = false): string {
  const a = fromIsoDay(monday)
  const b = fromIsoDay(addDays(monday, 6))
  // Across two months on a phone, both short, so it fits (Joe, 26 October).
  const m = short ? shortMonth : month
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} – ${b.getDate()} ${month.format(b)}`
    : `${a.getDate()} ${m.format(a)} – ${b.getDate()} ${m.format(b)}`
}

/** A day as Plan's toolbar says it: "Thursday 15 October", or "Thu 15 October" on a phone. */
export function dayTitle(day: string, short = false): string {
  const d = fromIsoDay(day)
  return `${short ? weekdayName(d) : longWeekday.format(d)} ${d.getDate()} ${month.format(d)}`
}
