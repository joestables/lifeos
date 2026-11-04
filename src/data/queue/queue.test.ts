import { describe, expect, it, vi } from 'vitest'
import { applyPending } from '../overlay'
import type { WriteArgs, WriteFn } from '../types'
import { writes } from '../writes'
import { WriteError } from './errors'
import { backoff, WriteQueue, type Transport } from './queue'
import { indexedDbQueueStore } from './store'

let storeCount = 0
const freshStore = () => indexedDbQueueStore(`test-queue-${++storeCount}`)

/** A server that can be switched off, recording every call it receives. */
function fakeServer() {
  const calls: { fn: WriteFn; args: WriteArgs }[] = []
  const server = {
    online: true,
    refuse: undefined as string | undefined,
    calls,
    transport: (async (fn, args) => {
      if (!server.online) throw new WriteError('Failed to fetch', false)
      calls.push({ fn, args })
      if (server.refuse && fn === server.refuse) throw new WriteError('violates check', true)
    }) as Transport,
  }
  return server
}

const noRetry = () => () => {}

describe('the write queue', () => {
  it('OFF-001: a write made offline shows at once, marked as not yet sent', async () => {
    const server = fakeServer()
    server.online = false
    const queue = new WriteQueue({
      store: freshStore(),
      transport: server.transport,
      schedule: noRetry,
    })
    const id = writes(queue).createItem('thought', { title: 'Milk' })
    await queue.flush()

    const [item] = applyPending([], queue.entries())
    expect(item).toMatchObject({ id, type: 'thought', title: 'Milk', sync: 'pending' })
    expect(server.calls).toHaveLength(0)
  })

  it('OFF-001: waiting writes are sent in order when the connection returns', async () => {
    const server = fakeServer()
    server.online = false
    const queue = new WriteQueue({
      store: freshStore(),
      transport: server.transport,
      schedule: noRetry,
    })
    const w = writes(queue)
    const id = w.createItem('task', { title: 'Book dentist' })
    w.updateItem(id, { do_on: '2026-10-12' })
    w.archiveItem(id)
    await queue.flush()

    server.online = true
    await queue.flush()
    expect(server.calls.map((c) => c.fn)).toEqual(['create_item', 'update_item', 'archive_item'])
    expect(queue.entries()).toHaveLength(0)
  })

  it('OFF-001: waiting writes survive closing the app', async () => {
    const server = fakeServer()
    server.online = false
    const store = freshStore()
    const first = new WriteQueue({ store, transport: server.transport, schedule: noRetry })
    writes(first).createItem('thought', { title: 'Call Mum' })
    await first.flush()

    server.online = true
    const reopened = new WriteQueue({ store, transport: server.transport, schedule: noRetry })
    await reopened.load()
    expect(reopened.entries()).toHaveLength(1)
    await reopened.flush()
    expect(server.calls).toHaveLength(1)
  })

  it('OFF-002: a create retried after a failure carries the same ID', async () => {
    const server = fakeServer()
    let failOnce = true
    const transport: Transport = async (fn, args) => {
      await server.transport(fn, args)
      if (failOnce) {
        failOnce = false
        throw new WriteError('timeout', false) // the server got it, but the reply was lost
      }
    }
    const queue = new WriteQueue({ store: freshStore(), transport, schedule: noRetry })
    const id = writes(queue).createItem('thought', { title: 'Milk' })
    await queue.flush()
    await queue.flush()

    expect(server.calls).toHaveLength(2)
    expect(server.calls.map((c) => (c.args as { p_id: string }).p_id)).toEqual([id, id])
    expect(queue.entries()).toHaveLength(0)
  })

  it('OFF-003: an edit sends only the fields that changed', async () => {
    const server = fakeServer()
    const queue = new WriteQueue({
      store: freshStore(),
      transport: server.transport,
      schedule: noRetry,
    })
    writes(queue).updateItem('01a1228a-1c6b-7102-90ef-65add224d545', { title: 'Dentist' })
    await queue.flush()
    await queue.flush()

    expect(server.calls[0]).toEqual({
      fn: 'update_item',
      args: { p_id: '01a1228a-1c6b-7102-90ef-65add224d545', p_patch: { title: 'Dentist' } },
    })
  })

  it('OFF-004: a write the server refuses is kept, marked failed and reported; the rest still send', async () => {
    const server = fakeServer()
    server.refuse = 'update_item'
    const onRejected = vi.fn()
    const queue = new WriteQueue({
      store: freshStore(),
      transport: server.transport,
      schedule: noRetry,
      onRejected,
    })
    const w = writes(queue)
    const id = w.createItem('thought', { title: 'Milk' })
    w.updateItem(id, { do_on: '2026-10-12' })
    w.archiveItem(id)
    await queue.flush()
    await queue.flush()

    expect(server.calls.map((c) => c.fn)).toEqual(['create_item', 'update_item', 'archive_item'])
    expect(queue.entries()).toMatchObject([
      { fn: 'update_item', state: 'failed', error: 'violates check' },
    ])
    expect(onRejected).toHaveBeenCalledOnce()
    expect(queue.entries()[0]?.itemIds).toEqual([id])
  })

  it('OFF-001 2: back online while a send is failing, the writes go at once, not after the wait', async () => {
    let online = false
    let release: (() => void) | undefined
    const calls: WriteFn[] = []
    const transport: Transport = async (fn) => {
      if (!online) {
        // A request still failing when the connection comes back.
        await new Promise<void>((r) => (release = r))
        throw new WriteError('Failed to fetch', false)
      }
      calls.push(fn)
    }
    const queue = new WriteQueue({ store: freshStore(), transport, schedule: noRetry })
    writes(queue).createItem('thought', { title: 'Milk' })
    const failing = queue.flush()
    await vi.waitFor(() => expect(release).toBeTypeOf('function'))
    online = true
    const now = queue.retryNow()
    release!()
    await failing
    await now
    await vi.waitFor(() => expect(calls).toEqual(['create_item']))
    expect(queue.entries()).toHaveLength(0)
  })

  it('retries with growing waits', async () => {
    const server = fakeServer()
    server.online = false
    const waits: number[] = []
    const queue = new WriteQueue({
      store: freshStore(),
      transport: server.transport,
      schedule: (_fn, ms) => {
        waits.push(ms)
        return () => {}
      },
    })
    writes(queue).createItem('thought')
    await queue.flush()
    await queue.flush()
    await queue.flush()
    expect(waits.slice(-3)).toEqual([1000, 2000, 4000])
    expect(backoff(20)).toBe(60_000)
  })

  it('sends one write at a time, even when asked twice', async () => {
    let inFlight = 0
    let most = 0
    const transport: Transport = async () => {
      most = Math.max(most, ++inFlight)
      await new Promise((r) => setTimeout(r, 5))
      inFlight--
    }
    const queue = new WriteQueue({ store: freshStore(), transport, schedule: noRetry })
    const w = writes(queue)
    w.createItem('thought')
    w.createItem('thought')
    await Promise.all([queue.flush(), queue.flush()])
    await queue.flush()
    expect(most).toBe(1)
    expect(queue.entries()).toHaveLength(0)
  })
})

describe('a write sent twice (OFF-004)', () => {
  it('is already applied when its own id is taken, and only then', async () => {
    const { alreadyApplied } = await import('./errors')
    const pkey = 'duplicate key value violates unique constraint "items_pkey"'
    expect(alreadyApplied({ code: '23505', message: pkey })).toBe(true)
    expect(
      alreadyApplied({ code: '23505', message: 'duplicate key value violates "pantry_name"' }),
    ).toBe(false)
    expect(alreadyApplied({ code: '42501', message: pkey })).toBe(false)
  })
})
