import type { RealtimeChannel } from '@supabase/supabase-js'
import { useEffect } from 'react'
import { spaceEntriesKey } from './food'
import { itemsKey } from './items'
import { listLinesKey, type ListLine } from './lists'
import { queryClient } from './queryClient'
import { listMealsKey, shopLinesKey, type ShopLine } from './shopping'
import { supabase } from './supabase'
import type { ItemRow } from './types'

export type LiveTable = 'lines' | 'list_meals' | 'shopping_list'

const TABLES: LiveTable[] = ['lines', 'list_meals', 'shopping_list']

/** The column a table's rows name their list by. */
const listColumn = (table: LiveTable) => (table === 'shopping_list' ? 'item_id' : 'list_id')

/**
 * What a change on a shopping table refreshes (ADR-0057): the table's own
 * query; a tick also clears out of stock or Required, and a Meal's lines come
 * and go with its Meals; a shop's own row comes with its Item, so a shop
 * someone else makes shows.
 */
export function liveKeys(table: LiveTable): (readonly unknown[])[] {
  if (table === 'lines') return [shopLinesKey, spaceEntriesKey]
  if (table === 'list_meals') return [listMealsKey, shopLinesKey, ['shopping', 'meals_of']]
  return [itemsKey]
}

/**
 * Whether a delete concerns me. Realtime sends every delete on a table, with
 * only its key and without checking who may read it, so one is acted on only
 * when it names a line or a shop on this device (`shops`: their ids).
 */
export function deleteIsMine(
  table: LiveTable,
  old: Record<string, unknown>,
  lines: readonly Pick<ShopLine, 'id'>[],
  shops: readonly string[],
): boolean {
  if (table === 'lines') return lines.some((l) => l.id === old.id)
  return shops.includes(String(old[listColumn(table)]))
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
        const shops = (queryClient.getQueryData<ItemRow[]>(itemsKey) ?? [])
          .filter((i) => i.type === 'shopping_list')
          .map((i) => i.id)
        if (deleteIsMine(table, change.old as Record<string, unknown>, lines, shops))
          refresh(liveKeys(table))
      })
    }
    // A Space's staples and Essentials: needed ones are an open shop's lines
    // (SHP-003 3). Realtime sends only my Spaces' rows, deletes all, and
    // refreshing them is cheap.
    channel.on('postgres_changes', { event: '*', schema: 'food', table: 'space_entries' }, () =>
      refresh([spaceEntriesKey]),
    )
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') refresh([...TABLES.flatMap(liveKeys), spaceEntriesKey])
    })
    return () => {
      clearTimeout(timer)
      void client.removeChannel(channel)
    }
  }, [list])
}

/**
 * Live Lists (NTE-008 2): while Notes' Lists or a List is open, a change
 * another device makes to a List's lines arrives through Supabase Realtime,
 * and its lines are fetched again, unsent writes staying laid over them.
 * Realtime sends every delete with its key alone, so a delete is acted on
 * only when it names a line on this device. On a List's page only its
 * lines' changes are sent.
 */
export function useLiveLists(list?: string) {
  useEffect(() => {
    const client = supabase()
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = () => {
      clearTimeout(timer)
      timer = setTimeout(() => void queryClient.invalidateQueries({ queryKey: listLinesKey }), 250)
    }
    const channel: RealtimeChannel = client.channel(list ? `list:${list}` : 'lists')
    const filter = list ? `list_id=eq.${list}` : undefined
    for (const event of ['INSERT', 'UPDATE'] as const)
      channel.on(
        'postgres_changes',
        { event, schema: 'core', table: 'list_lines', ...(filter && { filter }) },
        refresh,
      )
    channel.on(
      'postgres_changes',
      { event: 'DELETE', schema: 'core', table: 'list_lines' },
      (c) => {
        const lines = queryClient.getQueryData<ListLine[]>(listLinesKey) ?? []
        if (lines.some((l) => l.id === (c.old as { id?: unknown }).id)) refresh()
      },
    )
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') refresh()
    })
    return () => {
      clearTimeout(timer)
      void client.removeChannel(channel)
    }
  }, [list])
}
