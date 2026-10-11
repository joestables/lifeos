import type { Item } from '@/data'
import { isoDayOf } from './dates'

export interface InboxGroups {
  /** Open Tasks whose due date has passed, oldest due first. */
  overdue: Item[]
  /** Open Tasks to do today or earlier, or due today: timed ones by time, then by when made. */
  today: Item[]
  /** Thoughts, newest first. */
  toSort: Item[]
}

/** A repeating Task shows only its next open occurrence (ADR-0022). */
function nextOccurrences(tasks: Item[]): Item[] {
  const first = new Map<string, Item>()
  for (const t of tasks) {
    if (!t.series_id) continue
    const seen = first.get(t.series_id)
    if (!seen || (t.do_on ?? '') < (seen.do_on ?? '')) first.set(t.series_id, t)
  }
  return tasks.filter((t) => !t.series_id || first.get(t.series_id) === t)
}

/**
 * What Inbox shows (views/inbox.md): only a due date makes a Task overdue;
 * a do-on date in the past keeps it in Today (INB-003).
 */
export function inboxGroups(items: readonly Item[], now: Date = new Date()): InboxGroups {
  const today = isoDayOf(now)
  const open = nextOccurrences(
    items.filter((i) => i.type === 'task' && i.status === 'active' && i.archived_at === null),
  )
  const overdue = open
    .filter((t) => t.due_on !== null && t.due_on < today)
    .sort((a, b) => a.due_on!.localeCompare(b.due_on!) || a.created_at.localeCompare(b.created_at))
  const late = new Set(overdue)
  const todays = open
    .filter((t) => !late.has(t) && ((t.do_on !== null && t.do_on <= today) || t.due_on === today))
    .sort((a, b) => {
      if (a.do_at && b.do_at) return a.do_at.localeCompare(b.do_at)
      if (a.do_at) return -1
      if (b.do_at) return 1
      return a.created_at.localeCompare(b.created_at)
    })
  const toSort = items
    .filter((i) => i.type === 'thought' && i.archived_at === null)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  return { overdue, today: todays, toSort }
}

/** How many things wait in Inbox, for the drawer (INB-005). */
export const inboxCount = (g: InboxGroups) => g.overdue.length + g.today.length + g.toSort.length
