import { newId } from '../ids'
import type { WriteArgs, WriteFn } from '../types'
import { WriteError } from './errors'
import type { QueueEntry, QueueStore } from './store'

/** Calls one database function on the server; throws WriteError when it fails. */
export type Transport = <F extends WriteFn>(fn: F, args: WriteArgs<F>) => Promise<void>

export interface WriteQueueOptions {
  store: QueueStore
  transport: Transport
  /** Called once an entry is sent, before it leaves the queue. */
  onSent?: (entry: QueueEntry) => void
  /** Called when the server refuses an entry for good (OFF-004). */
  onRejected?: (entry: QueueEntry, error: WriteError) => void
  /** Runs fn while holding a lock shared by every tab, so one tab sends. */
  lock?: (fn: () => Promise<void>) => Promise<void>
  /** Waits before a retry; returns a function that cancels the wait. */
  schedule?: (fn: () => void, ms: number) => () => void
}

const webLock = (fn: () => Promise<void>) =>
  typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request('lifeos-write-queue', fn)
    : fn()

const timer = (fn: () => void, ms: number) => {
  const id = setTimeout(fn, ms)
  return () => clearTimeout(id)
}

/** Retries wait 1s, 2s, 4s … up to a minute. */
export function backoff(attempts: number): number {
  return Math.min(60_000, 1000 * 2 ** Math.max(0, attempts - 1))
}

/**
 * The write queue (ADR-0042): an outbox of database-function calls, kept in
 * IndexedDB and sent one at a time, in order.
 */
export class WriteQueue {
  private readonly opts: Required<Omit<WriteQueueOptions, 'onSent' | 'onRejected'>> &
    Pick<WriteQueueOptions, 'onSent' | 'onRejected'>
  private snapshot: readonly QueueEntry[] = []
  private readonly listeners = new Set<() => void>()
  private flushing: Promise<void> | undefined
  private cancelRetry: (() => void) | undefined
  private loaded: Promise<void> | undefined
  /** Entries made but not yet stored: shown at once, sent once stored. */
  private readonly unsaved = new Map<string, QueueEntry>()
  private saving: Promise<void> = Promise.resolve()
  private flushAgain = false
  /** Asked to send now while a run was going: send again after it, whatever its retry says. */
  private urgent = false

  constructor(options: WriteQueueOptions) {
    this.opts = { lock: webLock, schedule: timer, ...options }
  }

  /** Reads what is waiting from IndexedDB. */
  load(): Promise<void> {
    return (this.loaded ??= this.refresh())
  }

  /** What is waiting, in order. Stable between changes, for useSyncExternalStore. */
  entries = (): readonly QueueEntry[] => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Queues a call and starts sending. The change shows at once (OFF-001). */
  enqueue<F extends WriteFn>(fn: F, args: WriteArgs<F>, itemIds: string[]): QueueEntry {
    const entry: QueueEntry = {
      id: newId(),
      fn,
      args,
      itemIds,
      createdAt: Date.now(),
      attempts: 0,
      state: 'pending',
    }
    this.unsaved.set(entry.id, entry)
    this.publish([...this.snapshot, entry])
    this.saving = this.saving
      .then(() => this.load())
      .then(() => this.opts.store.put(entry))
      .then(() => {
        this.unsaved.delete(entry.id)
      })
    void this.flush()
    return entry
  }

  /**
   * Sends what is waiting, oldest first. A failure worth retrying stops the
   * run and tries again later; a refusal marks the entry failed and moves on.
   */
  flush(): Promise<void> {
    if (this.flushing) {
      // Something may have been queued after this run looked: look again after it.
      this.flushAgain = true
      return this.flushing
    }
    this.flushing = this.opts
      .lock(() => this.send())
      .finally(() => {
        this.flushing = undefined
        if (this.urgent) {
          this.urgent = false
          this.flushAgain = false
          void this.flush()
          return
        }
        if (this.flushAgain && !this.cancelRetry) {
          this.flushAgain = false
          void this.flush()
        }
        this.flushAgain = false
      })
    return this.flushing
  }

  /**
   * Sends what is waiting now, not when its backoff ends: back online, or
   * the app opened again (OFF-001 2). A run already going that fails is
   * followed at once by another.
   */
  retryNow(): Promise<void> {
    if (this.flushing) {
      this.urgent = true
      return this.flushing
    }
    return this.flush()
  }

  /** Removes a failed entry once the person has seen it. */
  async discard(id: string): Promise<void> {
    await this.opts.store.remove(id)
    await this.refresh()
  }

  /** Empties the queue: signing out (ACC-003). */
  async clear(): Promise<void> {
    this.cancelRetry?.()
    this.cancelRetry = undefined
    await this.saving
    await this.opts.store.clear()
    await this.refresh()
  }

  private async send(): Promise<void> {
    this.cancelRetry?.()
    this.cancelRetry = undefined
    await this.saving
    await this.refresh()
    for (;;) {
      const entry = this.snapshot.find((e) => e.state === 'pending')
      if (!entry) return
      try {
        await this.opts.transport(entry.fn, entry.args)
        this.opts.onSent?.(entry)
        await this.opts.store.remove(entry.id)
      } catch (cause) {
        const error = cause instanceof WriteError ? cause : new WriteError(String(cause), false)
        if (error.permanent) {
          const failed: QueueEntry = { ...entry, state: 'failed', error: error.message }
          await this.opts.store.put(failed)
          this.opts.onRejected?.(failed, error)
        } else {
          const attempts = entry.attempts + 1
          await this.opts.store.put({ ...entry, attempts })
          await this.refresh()
          this.cancelRetry = this.opts.schedule(() => void this.flush(), backoff(attempts))
          return
        }
      }
      await this.refresh()
    }
  }

  private async refresh(): Promise<void> {
    const stored = await this.opts.store.all()
    const ids = new Set(stored.map((e) => e.id))
    const unsaved = [...this.unsaved.values()].filter((e) => !ids.has(e.id))
    this.publish([...stored, ...unsaved].sort((a, b) => (a.id < b.id ? -1 : 1)))
  }

  private publish(entries: readonly QueueEntry[]): void {
    this.snapshot = entries
    for (const listener of this.listeners) listener()
  }
}
