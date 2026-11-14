import type { Item } from '@/data'
import { isoDayOf } from './dates'
import { dayOrder, isPast, planDays, type AlertTime, type Placed } from './plan'
import { currentOccurrences } from './series'
import { byTime } from './tasks'

/** The parts of a day on Today (TDY-002). */
export type DayPart = 'anytime' | 'morning' | 'afternoon' | 'evening'

export const DAY_PARTS: readonly { key: DayPart; label: string; until: string }[] = [
  { key: 'anytime', label: 'Anytime', until: '' },
  { key: 'morning', label: 'Morning', until: '12:00' },
  { key: 'afternoon', label: 'Afternoon', until: '17:00' },
  { key: 'evening', label: 'Evening', until: '24:00' },
]

/** A Meal's slot is in the part of the day it is eaten (TDY-002 2). */
const SLOT_PART: Record<string, DayPart> = {
  breakfast: 'morning',
  lunch: 'afternoon',
  dinner: 'evening',
}

/** An Item on Today: where Week has it today, its part of the day, and whether it has gone by. */
export interface OnToday {
  placed: Placed
  part: DayPart
  past: boolean
}

export interface TodayList {
  /** Open Tasks due before today, oldest due first (TDY-001 2). */
  overdue: Item[]
  /** The day's parts that have something, in order (TDY-002 1). */
  parts: { key: DayPart; label: string; items: OnToday[] }[]
  /** Everything on the page, done and past too: the drawer's count (TDY-005). */
  count: number
}

/** The part of the day a time is in: before 12:00 the morning, before 17:00 the afternoon. */
export const partOf = (time: string): DayPart =>
  time === '' ? 'anytime' : time < '12:00' ? 'morning' : time < '17:00' ? 'afternoon' : 'evening'

/**
 * Today (views/today.md): my overdue Tasks, then everything Week has today,
 * of every Type, in four parts. A Task to do on an earlier day and not done
 * stays, as on Plan's Tasks (TSK-004), and one ticked today stays struck
 * through (TDY-003 1). Thoughts are never on it (TDY-001 3).
 */
export function todayList(
  items: readonly Item[],
  today: string,
  timezone: string,
  alertsOf: (item: Item) => AlertTime[],
  now: Date = new Date(),
): TodayList {
  const tasks = currentOccurrences(
    items.filter((i) => i.type === 'task' && i.archived_at === null),
    today,
  )
  const overdue = tasks
    .filter((t) => t.status === 'active' && t.due_on !== null && t.due_on < today)
    .sort((a, b) => a.due_on!.localeCompare(b.due_on!) || byTime(a, b))
  const late = new Set(overdue.map((t) => t.id))

  // A repeating Task: its next open occurrence only (TSK-008).
  const shown = new Set(tasks.map((t) => t.id))
  const placed = (planDays(items, today, today, timezone, [], alertsOf).get(today) ?? []).filter(
    (p) => !late.has(p.item.id) && (p.item.type !== 'task' || shown.has(p.item.id)),
  )
  // Left from an earlier day: still to do, or done today.
  for (const t of tasks) {
    if (late.has(t.id) || t.do_on === null || t.do_on >= today) continue
    const doneToday = t.status === 'done' && isoDayOf(new Date(t.updated_at)) === today
    if (t.status !== 'active' && !doneToday) continue
    placed.push({ item: t, first: today, last: today, time: t.do_at?.slice(0, 5) ?? '' })
  }
  placed.sort(dayOrder(today))

  const parts = DAY_PARTS.map((d) => ({ key: d.key, label: d.label, items: [] as OnToday[] }))
  for (const p of placed) {
    const part = p.item.slot
      ? (SLOT_PART[p.item.slot] ?? 'anytime')
      : partOf(p.first < today ? '' : p.time)
    // A Meal never fades on Today: eaten, it is struck through (Joe, 14 November).
    parts
      .find((g) => g.key === part)!
      .items.push({ placed: p, part, past: p.item.type !== 'meal' && isPast(p.item, now, p) })
  }
  return {
    overdue,
    parts: parts.filter((g) => g.items.length > 0),
    count: overdue.length + placed.length,
  }
}
