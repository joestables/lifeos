import { describe, expect, it } from 'vitest'
import { applyPendingLinks } from './links'
import type { QueueEntry } from './queue/store'

const entry = (fn: string, args: Record<string, unknown>): QueueEntry =>
  ({ id: fn + JSON.stringify(args), fn, args, itemIds: [], state: 'pending', attempts: 0 }) as never

describe('links', () => {
  it('EVT-006: a Task linked for an Event shows at once, and unlinking takes it away', () => {
    const link = { p_id: 'l', p_from: 'task', p_to: 'event', p_link_type: 'for' }
    const linked = applyPendingLinks([], [entry('link_items', link)])
    expect(linked).toEqual([{ from_item: 'task', to_item: 'event', link_type: 'for' }])
    expect(
      applyPendingLinks(linked, [
        entry('unlink_items', { p_from: 'task', p_to: 'event', p_link_type: 'for' }),
      ]),
    ).toEqual([])
  })

  it('links the same pair once', () => {
    const link = { p_id: 'l', p_from: 'task', p_to: 'event', p_link_type: 'for' }
    const rows = [{ from_item: 'task', to_item: 'event', link_type: 'for' }]
    expect(applyPendingLinks(rows, [entry('link_items', link)])).toHaveLength(1)
  })
})
