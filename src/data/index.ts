/**
 * The data layer (ADR-0042): the only code that talks to Supabase. Screens
 * use what this exports.
 */
import { foldSent, itemsKey } from './items'
import { queryClient } from './queryClient'
import { indexedDbQueueStore, WriteQueue } from './queue'
import { session } from './session'
import { rpcTransport } from './supabase'
import type { ItemRow } from './types'
import { writes } from './writes'

export const queue = new WriteQueue({
  store: indexedDbQueueStore(),
  transport: rpcTransport,
  onSent: (entry) => {
    queryClient.setQueryData<ItemRow[]>(itemsKey, (old) => old && foldSent(old, entry))
    void queryClient.invalidateQueries({ queryKey: itemsKey })
  },
  onRejected: (entry, error) => {
    // Recorded in ops.events once it exists (Stage 1, step 12), never with the Item's content.
    console.error(`LifeOS: ${entry.fn} was refused: ${error.message}`)
  },
})

export const { createItem, updateItem, archiveItem, restoreItem, linkItems, unlinkItems } =
  writes(queue)

export const { unsentWrites, signOut } = session(queue)

export { authReady, signInWithGoogle, useAuth, type Me } from './auth'
export { useItems, useOnline, useQueueEntries, useSyncCounts } from './hooks'
export { newId } from './ids'
export type { Item, ItemFields, SyncState } from './types'
