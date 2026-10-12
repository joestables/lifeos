import type { Item } from '@/data'
import { isoDayOf } from './dates'
import { currentOccurrences } from './series'

export interface InboxGroups {
  /** Open Tasks whose due date has passed, oldest due first. */
  overdue: Item[]
  /** Open Tasks to do today or earlier, or due today: timed ones by time, then by when made. */
  today: Item[]
  /** Thoughts, newest first. */
  toSort: Item[]
}

/**
 * What Inbox shows (views/inbox.md): only a due date makes a Task overdue;
 * a do-on date in the past keeps it in Today (INB-003).
 */
export function inboxGroups(items: readonly Item[], now: Date = new Date()): InboxGroups {
  const today = isoDayOf(now)
  // A repeating Task's next open occurrence only (TSK-008).
  const open = currentOccurrences(
    items.filter((i) => i.type === 'task' && i.archived_at === null),
    today,
  ).filter((t) => t.status === 'active')
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
