import { addDays, weekdayOf } from '@lifeos/recurrence'
import type { Item, Series } from '@/data'
import { fromIsoDay } from './dates'
import { eventTimes } from './events'
import { dayOrder, isPast, placeOf, type AlertTime, type Placed } from './plan'
import { currentOccurrences, stillRepeats } from './series'
import { byTime, recurringTasks } from './tasks'

/** A group on one of Plan's tabs: Today, Tomorrow, each remaining day of this week, Later. */
export interface DayGroup<T> {
  key: string
  label: string
  entries: T[]
}

const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long' })

/**
 * Entries under Today, Tomorrow, each remaining day of the week (it ends on
 * Sunday) and Later, as All tasks has them (TSK-004); empty groups left out.
 */
export function byDay<T>(entries: readonly { day: string; value: T }[], today: string) {
  const tomorrow = addDays(today, 1)
  const week = Array.from({ length: Math.max(0, 5 - weekdayOf(today)) }, (_, i) =>
    addDays(today, i + 2),
  )
  const groups: DayGroup<T>[] = [
    { key: 'today', label: 'Today', entries: [] },
    { key: 'tomorrow', label: 'Tomorrow', entries: [] },
    ...week.map((day) => ({ key: day, label: weekday.format(fromIsoDay(day)), entries: [] })),
    { key: 'later', label: 'Later', entries: [] },
  ]
  const group = (key: string) => groups.find((g) => g.key === key)!
  for (const { day, value } of entries) {
    if (day < today) continue
    const key =
      day === today ? 'today' : day === tomorrow ? 'tomorrow' : week.includes(day) ? day : 'later'
    group(key).entries.push(value)
  }
  return groups.filter((g) => g.entries.length > 0)
}

/** An Event on Plan's Events tab: where Week has it, the day it is listed on, and whether it has ended. */
export interface EventEntry {
  placed: Placed
  day: string
  past: boolean
}

/** My Events from today on, a repeating one's next only (PLA-003). */
export function eventEntries(
  items: readonly Item[],
  today: string,
  timezone: string,
  now: Date = new Date(),
): EventEntry[] {
  const events = currentOccurrences(
    items.filter((i) => i.type === 'event' && i.archived_at === null),
    today,
  )
  const out: EventEntry[] = []
  for (const e of events) {
    const p = placeOf(e, timezone)
    if (!p || p.last < today) continue
    // One that began before today, and goes on, is listed today.
    const day = p.first < today ? today : p.first
    out.push({ placed: p, day, past: isPast(e, now) })
  }
  return out.sort((a, b) => a.day.localeCompare(b.day) || dayOrder(a.day)(a.placed, b.placed))
}

/** A Reminder on Plan's Reminders tab: the day of its next Alert, and that day's Alerts. */
export interface ReminderEntry {
  item: Item
  day: string
  alerts: AlertTime[]
  past: boolean
}

/**
 * My Reminders, each on the day of its next Alert, or today, faded, once
 * today's have all gone off; a repeating one's next only (PLA-004).
 */
export function reminderEntries(
  items: readonly Item[],
  today: string,
  alertsOf: (item: Item) => AlertTime[],
  now: Date = new Date(),
): ReminderEntry[] {
  const out: ReminderEntry[] = []
  for (const r of items) {
    if (r.type !== 'reminder' || r.archived_at !== null) continue
    const times = alertsOf(r)
    const next = times.find((t) => t.at > now.getTime())
    const day = next
      ? next.day
      : times.some((t) => t.day === today)
        ? today
        : times.length === 0
          ? r.do_on
          : null
    if (!day || day < today) continue
    const alerts = times.filter((t) => t.day === day)
    out.push({
      item: r,
      day,
      alerts,
      past: alerts.length > 0 && alerts.every((t) => t.at <= now.getTime()),
    })
  }
  out.sort(
    (a, b) =>
      a.day.localeCompare(b.day) ||
      (a.alerts[0]?.at ?? 0) - (b.alerts[0]?.at ?? 0) ||
      a.item.created_at.localeCompare(b.item.created_at),
  )
  // A repeating one: its next occurrence only.
  const seen = new Set<string>()
  return out.filter((e) => {
    if (!e.item.series_id) return true
    if (seen.has(e.item.series_id)) return false
    seen.add(e.item.series_id)
    return true
  })
}

/**
 * Plan's Recurring tab (PLA-005): each repeating Task, Event and Reminder
 * once, by its next occurrence, with its series, soonest first.
 */
export function recurringEntries(
  items: readonly Item[],
  series: ReadonlyMap<string, Series>,
  today: string,
  timezone: string,
  alertsOf: (item: Item) => AlertTime[],
  now: Date = new Date(),
) {
  const tasks = recurringTasks(items, series, now)
    .flatMap((g) => g.tasks)
    .sort(
      (a, b) => (a.task.do_on ?? '').localeCompare(b.task.do_on ?? '') || byTime(a.task, b.task),
    )
  const repeating = <T>(item: Item, value: T) => {
    const s = item.series_id ? series.get(item.series_id) : undefined
    return s && stillRepeats(item, s) ? [{ ...value, series: s }] : []
  }
  const events = eventEntries(items, today, timezone, now)
    .filter((e) => e.placed.item.series_id)
    .flatMap((e) => repeating(e.placed.item, e))
  const reminders = reminderEntries(items, today, alertsOf, now).flatMap((e) =>
    repeating(e.item, e),
  )
  return { tasks, events, reminders }
}

/** When an Event starts, on its first day: for "Next today, 20:00". */
export const startTime = (item: Item, timezone: string) => {
  const t = eventTimes(item, timezone)
  return t && !t.allDay ? t.startTime : undefined
}
