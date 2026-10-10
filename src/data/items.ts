import { applyPending } from './overlay'
import type { QueueEntry } from './queue/store'
import { supabase } from './supabase'
import type { Item, ItemRow } from './types'

export const itemsKey = ['items'] as const

/** Every live Item I can see; Views filter these (Stage 2 adds their own queries). */
export async function fetchItems(): Promise<ItemRow[]> {
  const { data, error } = await supabase()
    .from('items')
    .select('*')
    .is('archived_at', null)
    .order('created_at')
  if (error) throw error
  return data
}

/** Folds a sent write into the cached Items, so nothing flickers before the refetch. */
export function foldSent(items: readonly ItemRow[], entry: QueueEntry): ItemRow[] {
  return applyPending(items, [entry]).map((item: Item) => {
    const row: Item = { ...item }
    delete row.sync
    return row
  })
}
