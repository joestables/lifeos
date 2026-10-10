import { useQuery } from '@tanstack/react-query'
import { useMemo, useSyncExternalStore } from 'react'
import { fetchItems, itemsKey } from './items'
import { applyPending } from './overlay'
import type { WriteQueue } from './queue/queue'
import type { QueueEntry } from './queue/store'
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
  const query = useQuery({ queryKey: itemsKey, queryFn: fetchItems })
  const entries = useQueueEntries(queue)
  const online = useOnline()
  const items = useMemo(
    () => applyPending(query.data ?? [], entries).filter((i) => i.archived_at === null),
    [query.data, entries],
  )
  return { items, isLoading: query.isLoading, outOfDate: !online || query.isError }
}
