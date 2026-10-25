import type { RealtimeChannel } from '@supabase/supabase-js'
import { useEffect } from 'react'
import { spaceEntriesKey } from './food'
import { itemsKey } from './items'
import { queryClient } from './queryClient'
import { listMealsKey, listsKey, shopLinesKey, type ListDetail, type ShopLine } from './shopping'
import { supabase } from './supabase'

export type LiveTable = 'lines' | 'list_meals' | 'shopping_list'

const TABLES: LiveTable[] = ['lines', 'list_meals', 'shopping_list']

/** The column a table's rows name their list by. */
const listColumn = (table: LiveTable) => (table === 'shopping_list' ? 'item_id' : 'list_id')

/**
 * What a change on a shopping table refreshes (ADR-0057): the table's own
 * query; a tick also clears out of stock or Required, and a Meal's lines come
 * and go with its Meals; a list's own row comes with its Item.
 */
export function liveKeys(table: LiveTable): (readonly unknown[])[] {
  if (table === 'lines') return [shopLinesKey, spaceEntriesKey]
  if (table === 'list_meals') return [listMealsKey, shopLinesKey, ['shopping', 'meals_of']]
  return [listsKey, itemsKey]
}

/**
 * Whether a delete concerns me. Realtime sends every delete on a table, with
 * only its key and without checking who may read it, so one is acted on only
 * when it names a line or a list on this device.
 */
export function deleteIsMine(
  table: LiveTable,
  old: Record<string, unknown>,
  lines: readonly Pick<ShopLine, 'id'>[],
  lists: readonly Pick<ListDetail, 'item_id'>[],
): boolean {
  if (table === 'lines') return lines.some((l) => l.id === old.id)
  return lists.some((l) => l.item_id === old[listColumn(table)])
}

/**
 * Live Shopping (SHP-004 2, ADR-0057): while Shopping or a list is open, a
 * change another device makes to its lists arrives through Supabase
 * Realtime, and the data layer refreshes what it touches rather than
 * applying the change itself, so unsent writes stay laid over it. Joining,
 * and joining again after the connection drops, refreshes too, so nothing
 * missed while away is lost. On a list's page only its changes are sent.
 */
export function useLiveShopping(list?: string) {
  useEffect(() => {
    const client = supabase()
    // A Meal's change writes many lines at once: refresh once they've come.
    const due = new Set<string>()
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = (keys: (readonly unknown[])[]) => {
      for (const k of keys) due.add(JSON.stringify(k))
      clearTimeout(timer)
      timer = setTimeout(() => {
        for (const k of due)
          void queryClient.invalidateQueries({ queryKey: JSON.parse(k) as unknown[] })
        due.clear()
      }, 250)
    }

    const channel: RealtimeChannel = client.channel(list ? `shopping:${list}` : 'shopping')
    for (const table of TABLES) {
      const filter = list ? `${listColumn(table)}=eq.${list}` : undefined
      for (const event of ['INSERT', 'UPDATE'] as const)
        channel.on(
          'postgres_changes',
          { event, schema: 'shopping', table, ...(filter && { filter }) },
          () => refresh(liveKeys(table)),
        )
      channel.on('postgres_changes', { event: 'DELETE', schema: 'shopping', table }, (change) => {
        const lines = queryClient.getQueryData<ShopLine[]>(shopLinesKey) ?? []
        const lists = queryClient.getQueryData<ListDetail[]>(listsKey) ?? []
        if (deleteIsMine(table, change.old as Record<string, unknown>, lines, lists))
          refresh(liveKeys(table))
      })
    }
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') refresh(TABLES.flatMap(liveKeys))
    })
    return () => {
      clearTimeout(timer)
      void client.removeChannel(channel)
    }
  }, [list])
}
