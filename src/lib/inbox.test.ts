import { describe, expect, it } from 'vitest'
import type { Item } from '@/data'
import { inboxCount, inboxGroups } from './inbox'

const NOW = new Date(2026, 9, 11, 14, 0)

const item = (id: string, fields: Partial<Item>): Item => ({
  id,
  type: 'task',
  title: id,
  body: null,
  space_id: 's',
  owner_id: 'a',
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
  created_at: '2026-10-01T09:00:00Z',
  updated_at: '2026-10-01T09:00:00Z',
  archived_at: null,
  ...fields,
})

const ids = (items: Item[]) => items.map((i) => i.id)

describe('what Inbox shows (views/inbox.md)', () => {
  const items = [
    item('due-mon', { due_on: '2026-10-05' }),
    item('due-yesterday', { due_on: '2026-10-10' }),
    item('do-yesterday', { do_on: '2026-10-10', created_at: '2026-10-02T09:00:00Z' }),
    item('due-today', { due_on: '2026-10-11', created_at: '2026-10-03T09:00:00Z' }),
    item('today-18', { do_on: '2026-10-11', do_at: '18:00:00' }),
    item('today-08', { do_on: '2026-10-11', do_at: '08:00:00' }),
    item('tomorrow', { do_on: '2026-10-12' }),
    item('done', { do_on: '2026-10-11', status: 'done' }),
    item('someday', { do_on: '2026-10-11', status: 'idea' }),
    item('deleted', { do_on: '2026-10-11', archived_at: '2026-10-11T10:00:00Z' }),
    item('bins-1', { do_on: '2026-10-09', series_id: 'bins' }),
    item('bins-2', { do_on: '2026-10-16', series_id: 'bins' }),
    item('older-thought', { type: 'thought', created_at: '2026-10-09T09:00:00Z' }),
    item('new-thought', { type: 'thought', created_at: '2026-10-11T08:12:00Z' }),
    item('note', { type: 'note' }),
  ]
  const g = inboxGroups(items, NOW)

  it('INB-003: only a due date makes a Task overdue, oldest first', () => {
    expect(ids(g.overdue)).toEqual(['due-mon', 'due-yesterday'])
  })

  it('INB-003: Today holds what is to do today or earlier, or due today; timed ones first', () => {
    expect(ids(g.today)).toEqual(['today-08', 'today-18', 'bins-1', 'do-yesterday', 'due-today'])
  })

  it('INB-003: a repeating Task shows only its next open occurrence', () => {
    expect(ids(g.today)).not.toContain('bins-2')
  })

  it('INB-001: Thoughts wait to be sorted, newest first', () => {
    expect(ids(g.toSort)).toEqual(['new-thought', 'older-thought'])
  })

  it('INB-005: the count is everything waiting', () => {
    expect(inboxCount(g)).toBe(9)
  })
})
