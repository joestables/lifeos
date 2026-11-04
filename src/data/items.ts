import { applyPending } from './overlay'
import type { QueueEntry } from './queue/store'
import { supabase } from './supabase'
import type { Item, ItemRow } from './types'
import { allRows } from './paging'

export const itemsKey = ['items'] as const

/** The columns the app reads: every one but the search index. */
const ITEM_COLUMNS =
  'id, type, title, body, place, space_id, owner_id, status, starts_at, ends_at, all_day, due_on, do_on, do_at, slot, series_id, occurrence_on, position, touched_at, created_at, updated_at, archived_at'

/**
 * Every Item I can see, deleted ones included (for Recently deleted, ITM-003);
 * Views filter these.
 */
export async function fetchItems(): Promise<ItemRow[]> {
  return allRows((from, to) =>
    supabase().from('items').select(ITEM_COLUMNS).order('created_at').order('id').range(from, to),
  )
}

/** Folds a sent write into the cached Items, so nothing flickers before the refetch. */
export function foldSent(items: readonly ItemRow[], entry: QueueEntry): ItemRow[] {
  return applyPending(items, [entry]).map((item: Item) => {
    const row: Item = { ...item }
    delete row.sync
    return row
  })
}
