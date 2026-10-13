import type { Item, Series } from '@/data'
import { fromIsoDay, isoDayOf } from './dates'
import { currentOccurrences, stillRepeats } from './series'

export interface TaskGroup {
  key: string
  label: string
  /** Overdue: its heading and count are red. */
  danger?: boolean
  tasks: Item[]
}

const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long' })
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

/** Open Tasks, live, a repeating one's next open occurrence only (TSK-008). */
function open(items: readonly Item[], today: string): Item[] {
  return currentOccurrences(
    items.filter(
      (i) =>
        i.type === 'task' &&
        i.archived_at === null &&
        (i.status === 'active' || i.status === 'idea'),
    ),
    today,
  )
}

/** Timed first, by time; then by when made (TSK-012 adds a hand-made order). */
export function byTime(a: Item, b: Item): number {
  if (a.do_at && b.do_at) return a.do_at.localeCompare(b.do_at)
  if (a.do_at) return -1
  if (b.do_at) return 1
  return a.created_at.localeCompare(b.created_at)
}

/**
 * "All tasks" (views/tasks.md): Overdue, Today, Tomorrow, each remaining day
 * of this week, Later, No date, Someday — empty groups left out. A Task sits
 * under its do-on date, or its due date when it has none; only a due date
 * makes it overdue (TSK-004).
 */
export function taskGroups(items: readonly Item[], now: Date = new Date()): TaskGroup[] {
  const today = isoDayOf(now)
  const tomorrow = isoDayOf(addDays(now, 1))
  // The week ends on Sunday.
  const daysLeft = (7 - now.getDay()) % 7
  const week = Array.from({ length: Math.max(0, daysLeft - 1) }, (_, i) =>
    isoDayOf(addDays(now, i + 2)),
  )

  const groups: TaskGroup[] = [
    { key: 'overdue', label: 'Overdue', danger: true, tasks: [] },
    { key: 'today', label: 'Today', tasks: [] },
    { key: 'tomorrow', label: 'Tomorrow', tasks: [] },
    ...week.map((day) => ({ key: day, label: weekday.format(fromIsoDay(day)), tasks: [] })),
    { key: 'later', label: 'Later', tasks: [] },
    { key: 'none', label: 'No date', tasks: [] },
    { key: 'someday', label: 'Someday', tasks: [] },
  ]
  const group = (key: string) => groups.find((g) => g.key === key)!

  for (const t of open(items, today)) {
    if (t.status === 'idea') group('someday').tasks.push(t)
    else if (t.due_on !== null && t.due_on < today) group('overdue').tasks.push(t)
    else {
      const day = t.do_on ?? t.due_on
      if (day === null) group('none').tasks.push(t)
      else if (day <= today) group('today').tasks.push(t)
      else if (day === tomorrow) group('tomorrow').tasks.push(t)
      else if (week.includes(day)) group(day).tasks.push(t)
      else group('later').tasks.push(t)
    }
  }
  for (const g of groups) {
    if (g.key === 'overdue')
      g.tasks.sort((a, b) => a.due_on!.localeCompare(b.due_on!) || byTime(a, b))
    else if (g.key === 'later')
      g.tasks.sort(
        (a, b) => (a.do_on ?? a.due_on!).localeCompare(b.do_on ?? b.due_on!) || byTime(a, b),
      )
    else g.tasks.sort(byTime)
  }
  return groups.filter((g) => g.tasks.length > 0)
}

/** "Completed": done Tasks, most recently changed first. */
export function completedTasks(items: readonly Item[]): Item[] {
  return items
    .filter((i) => i.type === 'task' && i.archived_at === null && i.status === 'done')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

/**
 * "Recurring": each repeating Task once, by its next open occurrence — those
 * on a schedule, then those that come back after they're done — soonest
 * first (TSK-008, TSK-009).
 */
export function recurringTasks(
  items: readonly Item[],
  series: ReadonlyMap<string, Series>,
  now: Date = new Date(),
): { key: string; label: string; tasks: { task: Item; series: Series }[] }[] {
  const next = open(items, isoDayOf(now)).flatMap((task) => {
    const s = task.series_id ? series.get(task.series_id) : undefined
    return s && stillRepeats(task, s) ? [{ task, series: s }] : []
  })
  next.sort(
    (a, b) =>
      (a.task.do_on ?? '').localeCompare(b.task.do_on ?? '') ||
      byTime(a.task, b.task) ||
      a.task.title.localeCompare(b.task.title),
  )
  return [
    {
      key: 'schedule',
      label: 'On a schedule',
      tasks: next.filter((n) => n.series.mode === 'schedule'),
    },
    {
      key: 'after_completion',
      label: "After it's done",
      tasks: next.filter((n) => n.series.mode === 'after_completion'),
    },
  ].filter((g) => g.tasks.length > 0)
}
