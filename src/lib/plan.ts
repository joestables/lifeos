import { addDays, daysBetween, weekdayOf } from '@lifeos/recurrence'
import { hasTrait, typeByKey } from '@lifeos/ontology'
import type { Item } from '@/data'
import { dueWhen, fromIsoDay, shortDate, zonedParts } from './dates'

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
): Map<string, Placed[]> {
  const days = new Map<string, Placed[]>()
  for (let d = from; d <= to; d = addDays(d, 1)) days.set(d, [])
  for (const item of items) {
    if (hidden.includes(item.type)) continue
    const p = placeOf(item, timezone)
    if (!p || p.last < from || p.first > to) continue
    for (let d = p.first < from ? from : p.first; d <= p.last && d <= to; d = addDays(d, 1))
      days.get(d)!.push(p)
  }
  for (const [day, list] of days)
    list.sort((a, b) => {
      // An Event running on from an earlier day counts as all day there.
      const at = (p: Placed) => (p.first < day ? '' : p.time)
      return (
        at(a).localeCompare(at(b)) ||
        // Meals in slot order, among the untimed (PLN-008 1).
        slotRank(a.item) - slotRank(b.item) ||
        (a.item.position ?? '').localeCompare(b.item.position ?? '') ||
        a.item.created_at.localeCompare(b.item.created_at) ||
        a.item.id.localeCompare(b.item.id)
      )
    })
  return days
}

const SLOT_ORDER = ['breakfast', 'lunch', 'dinner']
const slotRank = (item: Item) => (item.slot ? SLOT_ORDER.indexOf(item.slot) + 1 : 0)

/**
 * What a card says on a day (patterns.md#plan): its time ("18:00", in a
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

/** Whether a card has gone by: an Event that has ended; a done Item (PLN-001 6). */
export function isPast(item: Item, now: Date = new Date()): boolean {
  if (item.status === 'done') return true
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
  // A Meal keeps its slot (PLN-008 5).
  if (item.type === 'task' || item.type === 'meal') return { do_on: to }
  return null
}

const month = new Intl.DateTimeFormat('en-GB', { month: 'long' })
const longWeekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long' })

/** A week as Plan's toolbar says it: "12 – 18 October", "28 September – 4 October". */
export function weekTitle(monday: string): string {
  const a = fromIsoDay(monday)
  const b = fromIsoDay(addDays(monday, 6))
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} – ${b.getDate()} ${month.format(b)}`
    : `${a.getDate()} ${month.format(a)} – ${b.getDate()} ${month.format(b)}`
}

/** A day as Plan's toolbar says it: "Thursday 15 October", or "Thu 15 October" on a phone. */
export function dayTitle(day: string, short = false): string {
  const d = fromIsoDay(day)
  return `${short ? weekdayName(d) : longWeekday.format(d)} ${d.getDate()} ${month.format(d)}`
}
