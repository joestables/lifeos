import { QueryClient } from '@tanstack/react-query'
import {
  persistQueryClientRestore,
  persistQueryClientSave,
} from '@tanstack/react-query-persist-client'
import { describe, expect, it, vi } from 'vitest'
import { foldSent, itemsKey } from './items'
import { applyPending } from './overlay'
import { persister, queryClient } from './queryClient'
import { indexedDbQueueStore, WriteError, WriteQueue } from './queue'
import { session } from './session'
import type { ItemRow } from './types'

const row = (id: string, title: string): ItemRow => ({
  id,
  type: 'task',
  title,
  body: null,
  place: null,
  space_id: 's',
  owner_id: 'o',
  status: 'active',
  starts_at: null,
  ends_at: null,
  all_day: null,
  due_on: null,
  do_on: null,
  do_at: null,
  slot: null,
  series_id: null,
  occurrence_on: null,
  position: null,
  touched_at: null,
  created_at: '2026-10-09T00:00:00Z',
  updated_at: '2026-10-09T00:00:00Z',
  archived_at: null,
})

describe('reading', () => {
  it('OFF-005: Items already loaded are kept on the device and come back after a reload', async () => {
    const before = new QueryClient()
    before.setQueryData(itemsKey, [row('a', 'Dentist')])
    await persistQueryClientSave({ queryClient: before, persister })

    const after = new QueryClient()
    await persistQueryClientRestore({ queryClient: after, persister })
    expect(after.getQueryData(itemsKey)).toEqual([row('a', 'Dentist')])
  })

  it('OFF-001, OFF-004: lays unsent edits over loaded Items, marked; folds them in once sent', () => {
    const entry = {
      id: 'e1',
      fn: 'update_item' as const,
      args: { p_id: 'a', p_patch: { title: 'Dentist, 3pm' } },
      itemIds: ['a'],
      createdAt: Date.parse('2026-10-09T12:00:00Z'),
      attempts: 0,
      state: 'pending' as const,
    }
    expect(applyPending([row('a', 'Dentist'), row('b', 'Milk')], [entry])).toMatchObject([
      { id: 'a', title: 'Dentist, 3pm', sync: 'pending' },
      { id: 'b', title: 'Milk' },
    ])
    expect(foldSent([row('a', 'Dentist')], entry)[0]).not.toHaveProperty('sync')
    expect(applyPending([row('a', 'Dentist')], [{ ...entry, state: 'failed' }])[0]?.sync).toBe(
      'failed',
    )
  })
})

describe('signing out', () => {
  it('ACC-003: warns about unsent writes, then removes them and every cached Item', async () => {
    const queue = new WriteQueue({
      store: indexedDbQueueStore('test-sign-out'),
      transport: async () => {
        throw new WriteError('Failed to fetch', false)
      },
      schedule: () => () => {},
    })
    queue.enqueue('create_item', { p_id: 'a', p_type: 'thought' }, ['a'])
    await queue.flush()
    queryClient.setQueryData(itemsKey, [row('a', 'Dentist')])
    await persistQueryClientSave({ queryClient, persister })

    const signOutOfSupabase = vi.fn(async () => ({ error: null }))
    const s = session(queue, signOutOfSupabase)
    expect(s.unsentWrites()).toBe(1)

    await s.signOut()
    expect(queue.entries()).toHaveLength(0)
    expect(queryClient.getQueryData(itemsKey)).toBeUndefined()
    expect(await persister.restoreClient()).toBeUndefined()
    expect(signOutOfSupabase).toHaveBeenCalledOnce()
  })
})
