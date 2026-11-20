import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useItems, useQueueEntries } from './hooks'
import { applyPendingListLines, fetchListLines, listLinesKey, type ListLine } from './lists'
import type { WriteQueue } from './queue/queue'
import type { Item } from './types'

/** A List as Notes' Lists and its page show it (NTE-006, NTE-007). */
export interface ListView {
  item: Item
  /** Its lines and subheadings, in order. */
  lines: ListLine[]
  /** The lines to tick: not its subheadings. */
  toTick: ListLine[]
  /** When it or one of its lines last changed: the Lists tab's order. */
  changedAt: string
}

export interface ListsData {
  lists: ListView[]
  byId: ReadonlyMap<string, ListView>
  isLoading: boolean
}

/** Every List I can see, its lines with unsent writes laid over (OFF-001). */
export function useLists(queue: WriteQueue): ListsData {
  const queued = useQueueEntries(queue)
  const { items, isLoading } = useItems(queue)
  const lines = useQuery({ queryKey: listLinesKey, queryFn: fetchListLines })
  return useMemo(() => {
    const by = new Map<string, ListLine[]>()
    for (const l of applyPendingListLines(lines.data ?? [], queued))
      by.set(l.list_id, [...(by.get(l.list_id) ?? []), l])
    const lists = items
      .filter((i) => i.type === 'list')
      .map((item): ListView => {
        const mine = by.get(item.id) ?? []
        const changedAt = mine.reduce(
          (latest, l) => (l.updated_at > latest ? l.updated_at : latest),
          item.updated_at,
        )
        return {
          item,
          lines: mine,
          toTick: mine.filter((l) => l.heading === null),
          changedAt,
        }
      })
    return {
      lists,
      byId: new Map(lists.map((l) => [l.item.id, l])),
      isLoading: isLoading || lines.isLoading,
    }
  }, [queued, items, isLoading, lines.data, lines.isLoading])
}
