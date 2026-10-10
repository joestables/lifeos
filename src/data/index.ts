/**
 * The data layer (ADR-0042): the only code that talks to Supabase. Screens
 * use what this exports.
 */
import { foldSent, itemsKey } from './items'
import { queryClient } from './queryClient'
import { indexedDbQueueStore, WriteQueue } from './queue'
import { session } from './session'
import { reportEvent } from './report'
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
  // Recorded without the Item's content: only which function failed (OFF-004).
  onRejected: (entry, error) =>
    void reportEvent('write_refused', error.message, { fn: entry.fn, attempts: entry.attempts }),
})

export const { createItem, updateItem, archiveItem, restoreItem, linkItems, unlinkItems } =
  writes(queue)

export const { unsentWrites, signOut } = session(queue)

export { authReady, signInWithGoogle, useAuth, type Me } from './auth'
export { useItems, useOnline, useQueueEntries, useSyncCounts } from './hooks'
export { newId } from './ids'
export { noteAction, reportEvent, startReporting } from './report'
export type { Item, ItemFields, SyncState } from './types'
