import { describe, expect, it } from 'vitest'
import { applyPending } from './overlay'
import { deleteIsMine, liveKeys } from './live'
import type { QueueEntry } from './queue/store'
import {
  applyPendingListMeals,
  applyPendingLists,
  applyPendingShopLines,
  type ShopLine,
} from './shopping'

const entry = (fn: string, args: Record<string, unknown>): QueueEntry =>
  ({ id: fn, fn, args, itemIds: [], createdAt: 0, attempts: 0, state: 'pending' }) as QueueEntry

const line = (id: string, more: Partial<ShopLine> = {}): ShopLine => ({
  id,
  list_id: 'l',
  position: '',
  heading: null,
  pantry_id: null,
  text: 'Milk',
  qty: null,
  qty_max: null,
  approx: false,
  unit: null,
  checked: false,
  meal_id: null,
  source_id: null,
  needed_space_id: null,
  ...more,
})

describe('SHP-001: a list shows at once, offline too', () => {
  it('a new food shop with its Meals, and a Thought made a list', () => {
    const made = entry('shopping.create_list', {
      p_id: 'l',
      p_fields: { title: 'Big shop', kind: 'food', meals: ['m1', 'm2'] },
    })
    expect(applyPendingLists([], [made])).toEqual([{ item_id: 'l', kind: 'food' }])
    expect(applyPendingListMeals([], [made]).map((m) => m.meal_id)).toEqual(['m1', 'm2'])
    expect(
      applyPendingLists(
        [],
        [
          entry('convert_item', { p_id: 't', p_type: 'shopping_list' }),
          entry('shopping.update_list', { p_id: 't', p_patch: { kind: 'list' } }),
        ],
      ),
    ).toEqual([{ item_id: 't', kind: 'list' }])
  })

  it('SHP-002 4: a Meal added and taken off', () => {
    const meals = applyPendingListMeals(
      [{ list_id: 'l', meal_id: 'm1' }],
      [
        entry('shopping.add_meals', { p_list: 'l', p_meals: ['m2'] }),
        entry('shopping.remove_meal', { p_list: 'l', p_meal: 'm1' }),
      ],
    )
    expect(meals).toEqual([{ list_id: 'l', meal_id: 'm2' }])
  })
})

describe('SHP-001 4, SHP-003: lines added, ticked and deleted at once', () => {
  it('a line added, changed and deleted; a Meal’s line only ticked', () => {
    const out = applyPendingShopLines(
      [line('m', { meal_id: 'meal' })],
      [
        entry('shopping.add_line', {
          p_id: 'a',
          p_list: 'l',
          p_fields: { text: ' Bread ', qty: 1 },
        }),
        entry('shopping.update_line', { p_id: 'a', p_patch: { qty: 2 } }),
        entry('shopping.update_line', { p_id: 'm', p_patch: { qty: 9 } }),
        entry('shopping.delete_line', { p_id: 'm' }),
        entry('shopping.tick', { p_ids: ['a', 'm'], p_checked: true }),
      ],
    )
    expect(out.map((l) => [l.id, l.text, l.qty, l.checked])).toEqual([
      ['a', 'Bread', 2, true],
      ['m', 'Milk', null, true],
    ])
    expect(
      applyPendingShopLines(out, [entry('shopping.delete_line', { p_id: 'a' })]).map((l) => l.id),
    ).toEqual(['m'])
  })

  it('SHP-002 5: a Meal taken off takes its unticked lines; ticked ones stay', () => {
    const out = applyPendingShopLines(
      [line('x', { meal_id: 'meal' }), line('y', { meal_id: 'meal', checked: true }), line('z')],
      [entry('shopping.remove_meal', { p_list: 'l', p_meal: 'meal' })],
    )
    expect(out.map((l) => l.id)).toEqual(['y', 'z'])
  })
})

describe('SHP-004 2: another device’s change refreshes what it touches', () => {
  it('a line refreshes the lines and what a tick clears; a Meal its lines too', () => {
    expect(liveKeys('lines')).toEqual([
      ['shopping', 'lines'],
      ['food', 'space_entries'],
    ])
    expect(liveKeys('list_meals')).toContainEqual(['shopping', 'lines'])
    expect(liveKeys('shopping_list')).toContainEqual(['items'])
  })

  it('a delete counts only when it names a line or list on this device', () => {
    const lines = [line('a')]
    const lists = [{ item_id: 'l' }]
    expect(deleteIsMine('lines', { id: 'a' }, lines, lists)).toBe(true)
    expect(deleteIsMine('lines', { id: 'someone else’s' }, lines, lists)).toBe(false)
    expect(deleteIsMine('list_meals', { list_id: 'l', meal_id: 'm' }, lines, lists)).toBe(true)
    expect(deleteIsMine('list_meals', { list_id: 'x', meal_id: 'm' }, lines, lists)).toBe(false)
    expect(deleteIsMine('shopping_list', { item_id: 'l' }, lines, lists)).toBe(true)
  })
})

describe('SHP-001 2: a new list shows at once, so its page opens on it', () => {
  it('makes the Item before the server answers (Joe, 26 October)', () => {
    const made = entry('shopping.create_list', {
      p_id: 'l',
      p_fields: { title: ' Big shop ', kind: 'food', do_on: '2026-10-17', space_id: 'home' },
    })
    const [l] = applyPending([], [made])
    expect([l?.type, l?.title, l?.do_on, l?.space_id, l?.sync]).toEqual([
      'shopping_list',
      'Big shop',
      '2026-10-17',
      'home',
      'pending',
    ])
  })
})
