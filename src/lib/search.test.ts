import { describe, expect, it } from 'vitest'
import type { Item } from '@/data'
import { byType, markMatches, resultLine, searchItems, searchWords } from './search'

const NOW = new Date(2026, 9, 12, 9, 0)

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

describe('the words of a search, as the database splits them', () => {
  it('lower case, split at anything but letters and digits', () => {
    expect(searchWords('  Home INSUR, 2026!')).toEqual(['home', 'insur', '2026'])
    expect(searchWords("o'brien")).toEqual(['o', 'brien'])
    expect(searchWords(' ,. ')).toEqual([])
  })
})

describe('searching the device (SRC-002)', () => {
  const labels: Record<string, string[]> = { car: ['Insurance'] }
  const of = (id: string) => labels[id] ?? []
  const items = [
    item('note', {
      type: 'note',
      title: 'House details',
      body: 'Home insurance renews in January',
    }),
    item('car', { title: 'Phone the garage', updated_at: '2026-10-05T09:00:00Z' }),
    item('renew', { title: 'Renew car insurance' }),
    item('other', { title: 'Buy milk', body: 'semi-skimmed' }),
  ]

  it('finds a word by its start in the title, the Labels or the body; title matches first', () => {
    expect(ids(searchItems(items, of, 'insur'))).toEqual(['renew', 'car', 'note'])
  })

  it('needs every word', () => {
    expect(ids(searchItems(items, of, 'home insur'))).toEqual(['note'])
    expect(ids(searchItems(items, of, 'renew milk'))).toEqual([])
  })

  it('a word inside another word is not a match', () => {
    expect(ids(searchItems(items, of, 'surance'))).toEqual([])
  })

  it('then the most recently changed', () => {
    const two = [
      item('old', { title: 'Plumber', updated_at: '2026-10-01T09:00:00Z' }),
      item('new', { title: 'Plumber quote', updated_at: '2026-10-09T09:00:00Z' }),
    ]
    expect(ids(searchItems(two, of, 'plumb'))).toEqual(['new', 'old'])
  })

  it('nothing typed finds nothing', () => {
    expect(searchItems(items, of, '  ')).toEqual([])
  })
})

describe('the match in bold (SRC-001 2)', () => {
  it('marks the start of each word a search word starts', () => {
    expect(markMatches('Renew car insurance', ['insur'])).toEqual([
      { text: 'Renew car ' },
      { text: 'insur', match: true },
      { text: 'ance' },
    ])
  })

  it('whatever the case, and the longest search word', () => {
    expect(markMatches('Home-Insurance', ['h', 'home', 'ins'])).toEqual([
      { text: 'Home', match: true },
      { text: '-' },
      { text: 'Ins', match: true },
      { text: 'urance' },
    ])
  })

  it('leaves text with no match as it is', () => {
    expect(markMatches('Buy milk', ['insur'])).toEqual([{ text: 'Buy milk' }])
  })
})

describe("a result's line", () => {
  it('the line of the body the search found, as plain words', () => {
    const note = item('n', {
      type: 'note',
      title: 'House details',
      body: '# Boiler\nServiced in May\n- **Home insurance** renews in January',
    })
    expect(resultLine(note, ['insur'], [], NOW)).toEqual({
      text: 'Home insurance renews in January',
    })
  })

  it('starts a long line a little before its match', () => {
    const note = item('n', {
      type: 'note',
      title: 'Notes',
      body: 'A long line about many things that go on and on before it says insurance at last',
    })
    expect(resultLine(note, ['insur'], [], NOW)!.text).toBe('…before it says insurance at last')
  })

  it("an untitled Item's first line is its title, so not its line", () => {
    const note = item('n', { type: 'note', title: '', body: 'Insurance\nPolicy 123' })
    expect(resultLine(note, ['insur'], [], NOW)).toEqual({ text: 'Policy 123' })
  })

  it('its Labels when they matched', () => {
    expect(
      resultLine(item('t', { title: 'Garage' }), ['insur'], ['Car', 'Insurance'], NOW),
    ).toEqual({
      text: 'Car · Insurance',
    })
  })

  it("else a Task's due date, red once passed; its day; or when it was done", () => {
    expect(resultLine(item('t', { due_on: '2026-10-08' }), ['t'], [], NOW)).toEqual({
      text: 'Due Thu 8 Oct',
      danger: true,
    })
    expect(
      resultLine(item('t', { do_on: '2026-10-13', do_at: '18:00:00' }), ['t'], [], NOW),
    ).toEqual({
      text: 'Tomorrow 18:00',
    })
    expect(resultLine(item('t', { due_on: '2026-10-20' }), ['t'], [], NOW)).toEqual({
      text: 'Due Tue 20 Oct',
    })
    expect(
      resultLine(item('t', { status: 'done', updated_at: '2026-10-04T10:00:00Z' }), ['t'], [], NOW),
    ).toEqual({ text: 'Completed Sun 4 Oct' })
    expect(resultLine(item('t', { status: 'idea' }), ['t'], [], NOW)).toEqual({ text: 'Someday' })
    expect(resultLine(item('t', {}), ['t'], [], NOW)).toBeUndefined()
  })

  it('when a Thought was captured; the start of a Note', () => {
    expect(
      resultLine(
        item('t', { type: 'thought', created_at: '2026-10-06T10:00:00Z' }),
        ['t'],
        [],
        NOW,
      ),
    ).toEqual({ text: 'Tue' })
    expect(resultLine(item('n', { type: 'note', body: 'First line' }), ['n'], [], NOW)).toEqual({
      text: 'First line',
    })
  })
})

describe('results by Type', () => {
  it('in groups, each where its best result is', () => {
    const groups = byType([
      item('t1', {}),
      item('n1', { type: 'note' }),
      item('t2', {}),
      item('th', { type: 'thought' }),
    ])
    expect(groups.map((g) => [g.type, ids(g.items)])).toEqual([
      ['task', ['t1', 't2']],
      ['note', ['n1']],
      ['thought', ['th']],
    ])
  })
})
