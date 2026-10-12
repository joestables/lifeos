import { useQuery } from '@tanstack/react-query'
import { useMemo, useSyncExternalStore } from 'react'
import { fetchItems, itemsKey } from './items'
import {
  applyPendingItemLabels,
  applyPendingLabels,
  applyPendingMarks,
  fetchItemLabels,
  fetchLabels,
  fetchMarks,
  itemLabelsKey,
  labelsKey,
  marksKey,
  type Label,
} from './labels'
import { applyPending } from './overlay'
import type { WriteQueue } from './queue/queue'
import type { QueueEntry } from './queue/store'
import { applyPendingReminders, fetchReminders, remindersKey, type Reminder } from './reminders'
import { applyPendingSubtasks, fetchSubtasks, subtasksKey, type Subtask } from './subtasks'
import { DEFAULT_SETTINGS, fetchSettings, settingsKey, type Settings } from './settings'
import type { Item } from './types'

const subscribeOnline = (onChange: () => void) => {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

/** Whether the device thinks it has a connection. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  )
}

export function useQueueEntries(queue: WriteQueue): readonly QueueEntry[] {
  return useSyncExternalStore(queue.subscribe, queue.entries, queue.entries)
}

/** How many writes are waiting, and how many the server refused (SyncStatus). */
export function useSyncCounts(queue: WriteQueue): { pending: number; failed: number } {
  const entries = useQueueEntries(queue)
  return useMemo(
    () => ({
      pending: entries.filter((e) => e.state === 'pending').length,
      failed: entries.filter((e) => e.state === 'failed').length,
    }),
    [entries],
  )
}

/** Every Item, deleted ones included, with unsent changes laid over them. */
function useAllItems(queue: WriteQueue) {
  const query = useQuery({ queryKey: itemsKey, queryFn: fetchItems })
  const entries = useQueueEntries(queue)
  const online = useOnline()
  const all = useMemo(() => applyPending(query.data ?? [], entries), [query.data, entries])
  return { all, isLoading: query.isLoading, outOfDate: !online || query.isError }
}

/**
 * Live Items, with unsent changes laid over them. `outOfDate` is true when
 * what shows may be behind the server: offline, or the last refresh failed
 * (OFF-005).
 */
export function useItems(queue: WriteQueue): {
  items: Item[]
  isLoading: boolean
  outOfDate: boolean
} {
  const { all, isLoading, outOfDate } = useAllItems(queue)
  const items = useMemo(() => all.filter((i) => i.archived_at === null), [all])
  return { items, isLoading, outOfDate }
}

/** Deleted Items, the most recently deleted first (ITM-003). */
export function useDeletedItems(queue: WriteQueue): { items: Item[]; isLoading: boolean } {
  const { all, isLoading } = useAllItems(queue)
  const items = useMemo(
    () =>
      all
        .filter((i) => i.archived_at !== null)
        .sort((a, b) => (a.archived_at! < b.archived_at! ? 1 : -1)),
    [all],
  )
  return { items, isLoading }
}

/**
 * One Item by its id, live or deleted: `missing` once it is known not to be
 * among what I can see (ITM-001).
 */
export function useItem(
  queue: WriteQueue,
  id: string,
): { item: Item | undefined; status: 'loading' | 'found' | 'missing' } {
  const { all, isLoading } = useAllItems(queue)
  const item = all.find((i) => i.id === id && i.archived_at === null)
  return { item, status: item ? 'found' : isLoading ? 'loading' : 'missing' }
}

/** My Labels, by name, each with how many live Items have it (ITM-005). */
export function useLabels(queue: WriteQueue): {
  labels: (Label & { count: number })[]
  itemLabels: { item_id: string; label_id: string }[]
  isLoading: boolean
} {
  const entries = useQueueEntries(queue)
  const labelsQuery = useQuery({ queryKey: labelsKey, queryFn: fetchLabels })
  const itemLabelsQuery = useQuery({ queryKey: itemLabelsKey, queryFn: fetchItemLabels })
  const { items } = useItems(queue)
  return useMemo(() => {
    const live = new Set(items.map((i) => i.id))
    const itemLabels = applyPendingItemLabels(itemLabelsQuery.data ?? [], entries).filter((r) =>
      live.has(r.item_id),
    )
    const labels = applyPendingLabels(labelsQuery.data ?? [], entries).map((l) => ({
      ...l,
      count: itemLabels.filter((r) => r.label_id === l.id).length,
    }))
    return { labels, itemLabels, isLoading: labelsQuery.isLoading }
  }, [labelsQuery.data, labelsQuery.isLoading, itemLabelsQuery.data, items, entries])
}

/** The Items I have pinned or starred. */
export function useMarks(queue: WriteQueue): ReadonlySet<string> {
  const entries = useQueueEntries(queue)
  const query = useQuery({ queryKey: marksKey, queryFn: fetchMarks })
  return useMemo(
    () => new Set(applyPendingMarks(query.data ?? [], entries).map((m) => m.item_id)),
    [query.data, entries],
  )
}

/** My settings, or the defaults until they have loaded. */
export function useSettings(): Settings {
  const query = useQuery({ queryKey: settingsKey, queryFn: fetchSettings })
  return query.data ?? DEFAULT_SETTINGS
}

/** My Reminders, with unsent ones laid over them. */
export function useReminders(queue: WriteQueue): readonly Reminder[] {
  const entries = useQueueEntries(queue)
  const query = useQuery({ queryKey: remindersKey, queryFn: fetchReminders })
  return useMemo(() => applyPendingReminders(query.data ?? [], entries), [query.data, entries])
}

/** Every sub-task of the Tasks I can see, in order, with unsent ones laid over them. */
export function useSubtasks(queue: WriteQueue): readonly Subtask[] {
  const entries = useQueueEntries(queue)
  const query = useQuery({ queryKey: subtasksKey, queryFn: fetchSubtasks })
  return useMemo(() => applyPendingSubtasks(query.data ?? [], entries), [query.data, entries])
}
