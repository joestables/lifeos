/**
 * The data layer (ADR-0042): the only code that talks to Supabase. Screens
 * use what this exports.
 */
import type { QueryKey } from '@tanstack/react-query'
import { foldSent, itemsKey } from './items'
import {
  applyPendingItemLabels,
  applyPendingLabels,
  applyPendingMarks,
  itemLabelsKey,
  labelsKey,
  marksKey,
  type Label,
} from './labels'
import { queryClient } from './queryClient'
import { indexedDbQueueStore, WriteQueue } from './queue'
import type { QueueEntry } from './queue/store'
import { session } from './session'
import { reportEvent } from './report'
import { rpcTransport } from './supabase'
import type { ItemRow, WriteFn } from './types'
import { writes } from './writes'

/**
 * Each cached collection, the writes that change it, and how a sent write is
 * folded in, so nothing flickers before the refetch.
 */
const collections: {
  key: QueryKey
  fns: WriteFn[]
  fold: (rows: never, e: QueueEntry) => unknown
}[] = [
  {
    key: itemsKey,
    fns: ['create_item', 'update_item', 'archive_item', 'restore_item', 'convert_item'],
    fold: (rows: ItemRow[], e: QueueEntry) => foldSent(rows, e),
  },
  {
    key: labelsKey,
    fns: ['create_label', 'rename_label', 'delete_label'],
    fold: (rows: Label[], e: QueueEntry) => applyPendingLabels(rows, [e]),
  },
  {
    key: itemLabelsKey,
    fns: ['add_label', 'remove_label', 'delete_label', 'convert_item'],
    fold: (rows: Parameters<typeof applyPendingItemLabels>[0], e: QueueEntry) =>
      applyPendingItemLabels(rows, [e]),
  },
  {
    key: marksKey,
    fns: ['set_mark', 'convert_item'],
    fold: (rows: Parameters<typeof applyPendingMarks>[0], e: QueueEntry) =>
      applyPendingMarks(rows, [e]),
  },
]

export const queue = new WriteQueue({
  store: indexedDbQueueStore(),
  transport: rpcTransport,
  onSent: (entry) => {
    for (const c of collections) {
      if (!c.fns.includes(entry.fn)) continue
      queryClient.setQueryData(c.key, (old: never) => old && c.fold(old, entry))
      void queryClient.invalidateQueries({ queryKey: c.key })
    }
  },
  // Recorded without the Item's content: only which function failed (OFF-004).
  onRejected: (entry, error) =>
    void reportEvent('write_refused', error.message, { fn: entry.fn, attempts: entry.attempts }),
})

const labelsNow = () =>
  applyPendingLabels(queryClient.getQueryData<Label[]>(labelsKey) ?? [], queue.entries())

export const {
  createItem,
  updateItem,
  archiveItem,
  restoreItem,
  convertItem,
  linkItems,
  unlinkItems,
  createLabel,
  renameLabel,
  deleteLabel,
  addLabel,
  removeLabel,
  setMark,
} = writes(queue, labelsNow)

export const { unsentWrites, signOut } = session(queue)

export { authReady, signInWithGoogle, useAuth, type Me } from './auth'
export {
  useDeletedItems,
  useItem,
  useItems,
  useLabels,
  useMarks,
  useOnline,
  useQueueEntries,
  useSyncCounts,
} from './hooks'
export { newId } from './ids'
export type { Label } from './labels'
export { noteAction, reportEvent, startReporting } from './report'
export type { Item, ItemFields, SyncState } from './types'
