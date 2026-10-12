import { describe, expect, it } from 'vitest'
import type { QueueEntry } from './queue/store'
import { applyPendingSubtasks, nextPosition, type Subtask } from './subtasks'

const entry = (fn: string, args: Record<string, unknown>): QueueEntry =>
  ({
    id: fn,
    fn,
    args,
    itemIds: [],
    createdAt: 0,
    attempts: 0,
    state: 'pending',
  }) as unknown as QueueEntry

describe('TSK-006: unsent sub-task writes show at once', () => {
  const rows: Subtask[] = [
    { id: 'a', item_id: 't', title: 'Get a quote', done: false, position: '0000000001' },
  ]

  it('adds after, ticks and renames, and removes', () => {
    const later = nextPosition()
    const out = applyPendingSubtasks(rows, [
      entry('add_subtask', { p_id: 'b', p_item: 't', p_title: 'Pay', p_position: later }),
      entry('update_subtask', { p_id: 'a', p_patch: { done: true, title: 'Get two quotes' } }),
    ])
    expect(out).toEqual([
      { id: 'a', item_id: 't', title: 'Get two quotes', done: true, position: '0000000001' },
      { id: 'b', item_id: 't', title: 'Pay', done: false, position: later },
    ])
    expect(applyPendingSubtasks(out, [entry('remove_subtask', { p_id: 'a' })])).toHaveLength(1)
  })

  it('a position made later sorts after one made earlier', () => {
    const first = nextPosition()
    expect(first > '0000000001').toBe(true)
  })
})
