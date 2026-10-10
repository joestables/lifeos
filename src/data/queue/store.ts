import { clear, createStore, del, set, values, type UseStore } from 'idb-keyval'
import type { WriteArgs, WriteFn } from '../types'

/** One database-function call waiting to be sent (ADR-0042). */
export interface QueueEntry {
  /** UUIDv7, so entries sort in the order they were made. */
  id: string
  fn: WriteFn
  args: WriteArgs
  /** The Items it changes, to mark them as not yet sent. */
  itemIds: string[]
  createdAt: number
  attempts: number
  state: 'pending' | 'failed'
  error?: string
}

/** Where queued writes are kept: IndexedDB, so they survive a reload (OFF-001). */
export interface QueueStore {
  all(): Promise<QueueEntry[]>
  put(entry: QueueEntry): Promise<void>
  remove(id: string): Promise<void>
  clear(): Promise<void>
}

export function indexedDbQueueStore(name = 'lifeos-queue'): QueueStore {
  let store: UseStore | undefined
  const db = () => (store ??= createStore(name, 'entries'))
  return {
    all: async () => (await values<QueueEntry>(db())).sort((a, b) => (a.id < b.id ? -1 : 1)),
    put: (entry) => set(entry.id, entry, db()),
    remove: (id) => del(id, db()),
    clear: () => clear(db()),
  }
}
