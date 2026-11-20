import { describe, expect, it } from 'vitest'
import { applyPendingListLines, type ListLine } from './lists'
import type { QueueEntry } from './queue/store'

const entry = (fn: string, args: Record<string, unknown>, createdAt = 0): QueueEntry =>
  ({ id: fn, fn, args, itemIds: [], createdAt, attempts: 0, state: 'pending' }) as QueueEntry

const line = (id: string, more: Partial<ListLine> = {}): ListLine => ({
  id,
  list_id: 'l',
  position: id,
  heading: null,
  text: 'Passport',
  checked: false,
  updated_at: '2026-11-20T10:00:00.000Z',
  ...more,
})

describe('NTE-006: a List’s lines show at once, offline too (OFF-001)', () => {
  it('adds a line and a subheading, trimmed, in position, once when sent twice', () => {
    const add = entry('add_list_line', {
      p_id: 'b',
      p_list: 'l',
      p_fields: { position: 'b', text: ' Shorts ' },
    })
    const out = applyPendingListLines(
      [line('c')],
      [
        add,
        add,
        entry('add_list_line', {
          p_id: 'a',
          p_list: 'l',
          p_fields: { position: 'a', heading: 'Wear' },
        }),
      ],
    )
    expect(out.map((l) => [l.id, l.heading, l.text])).toEqual([
      ['a', 'Wear', null],
      ['b', null, 'Shorts'],
      ['c', null, 'Passport'],
    ])
  })

  it('leaves out a line with no words, as the server refuses it', () => {
    expect(
      applyPendingListLines(
        [],
        [entry('add_list_line', { p_id: 'a', p_list: 'l', p_fields: { text: ' ' } })],
      ),
    ).toEqual([])
  })

  it('ticks and unticks lines, never a subheading, and dates the change', () => {
    const rows = [line('a'), line('h', { heading: 'Wear', text: null })]
    const ticked = applyPendingListLines(rows, [
      entry(
        'tick_list_lines',
        { p_ids: ['a', 'h'], p_checked: true },
        Date.parse('2026-11-21T09:00:00Z'),
      ),
    ])
    expect(ticked.map((l) => l.checked)).toEqual([true, false])
    expect(ticked[0]!.updated_at).toBe('2026-11-21T09:00:00.000Z')
    expect(ticked[1]!.updated_at).toBe('2026-11-20T10:00:00.000Z')
    const back = applyPendingListLines(ticked, [
      entry('tick_list_lines', { p_ids: ['a'], p_checked: false }),
    ])
    expect(back[0]!.checked).toBe(false)
  })

  it('renames a line or subheading as itself, never emptied, and removes one', () => {
    const rows = [line('a'), line('h', { heading: 'Wear', text: null })]
    const out = applyPendingListLines(rows, [
      entry('update_list_line', { p_id: 'a', p_patch: { text: 'Visa', heading: 'x' } }),
      entry('update_list_line', { p_id: 'h', p_patch: { heading: 'Clothes', text: 'x' } }),
      entry('update_list_line', { p_id: 'a', p_patch: { text: '  ' } }),
    ])
    expect(out.map((l) => [l.heading, l.text])).toEqual([
      [null, 'Visa'],
      ['Clothes', null],
    ])
    expect(
      applyPendingListLines(rows, [entry('remove_list_line', { p_id: 'a' })]).map((l) => l.id),
    ).toEqual(['h'])
  })
})
