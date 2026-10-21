import { describe, expect, it } from 'vitest'
import type { Activity, Line, PantryEntry } from '@/data'
import type { RecipeView } from '@/data/food-hooks'
import { filterLog, recipeLog } from './recipe-log'
import {
  amountText,
  compareLines,
  editableText,
  ingredientGroups,
  readAmount,
  storedText,
  textParts,
  typedReference,
} from './recipe-parts'

const SAUCE = '01990000-0000-7000-8000-000000000011'
const pantry = new Map<string, PantryEntry>([
  [
    'p',
    {
      id: 'p',
      name: 'Panko',
      kind: 'ingredient',
      aisle: 'cupboard',
      default_unit: 'g',
      added_by: 'me',
    },
  ],
])
const line = (l: Partial<Line> & { id: string; position: string }): Line => ({
  variation_id: 'v',
  heading: null,
  pantry_id: null,
  text: null,
  qty: null,
  qty_max: null,
  approx: false,
  unit: null,
  ...l,
})
const lines = [
  line({ id: 'a', position: 'b', pantry_id: 'p', qty: 100, unit: 'g' }),
  line({ id: 'h', position: 'c', heading: 'For the sauce' }),
  line({ id: 'c', position: 'd', text: 'Honey', qty: 1, qty_max: 2, unit: 'tbsp' }),
  line({ id: 's', position: 'e', text: 'Salt' }),
]

describe('RCP-005, RCP-011: ingredients to read, scaled', () => {
  it('groups lines under subheadings, in position order', () => {
    expect(ingredientGroups(lines, pantry)).toEqual([
      { lines: [{ key: 'a', amount: '100 g', name: 'Panko' }] },
      {
        heading: 'For the sauce',
        lines: [
          { key: 'c', amount: '1–2 tbsp', name: 'Honey', typed: true },
          { key: 's', name: 'Salt', typed: true },
        ],
      },
    ])
  })

  it('scales both ends of a range, rounded for showing', () => {
    const [first, sauce] = ingredientGroups(lines, pantry, 1.5)
    expect(first!.lines[0]!.amount).toBe('150 g')
    expect(sauce!.lines[0]!.amount).toBe('1½–3 tbsp')
  })
})

describe('RCP-007: an amount as typed', () => {
  it('reads ranges, approximate amounts and a unit written on', () => {
    expect(readAmount('1-2')).toEqual({ qty: 1, qty_max: 2, approx: false })
    expect(readAmount('~5')).toEqual({ qty: 5, qty_max: null, approx: true })
    expect(readAmount('200g')).toEqual({ qty: 200, qty_max: null, approx: false, unit: 'g' })
    expect(readAmount('')).toEqual({ qty: null, qty_max: null, approx: false })
    expect(readAmount('lots')).toBeNull()
    expect(amountText({ qty: 1, qty_max: 2, approx: true })).toBe('~1–2')
  })
})

describe('RCP-008: "@" references', () => {
  const titles = new Map([[SAUCE, 'Katsu sauce (v2)']])
  const text = `Make the @[Katsu sauce](${SAUCE}) and keep it warm.`

  it('shows a reference under its name now, and as plain text once gone', () => {
    expect(textParts(text, titles)).toEqual([
      'Make the ',
      { recipe: 'Katsu sauce (v2)', id: SAUCE },
      ' and keep it warm.',
    ])
    expect(textParts(text, new Map())).toEqual(['Make the Katsu sauce and keep it warm.'])
  })

  it('edits as "@Name" and keeps it as a reference again', () => {
    const e = editableText(text, titles)
    expect(e.text).toBe('Make the @Katsu sauce (v2) and keep it warm.')
    expect(storedText(e.text, e.refs)).toBe(
      `Make the @[Katsu sauce (v2)](${SAUCE}) and keep it warm.`,
    )
  })

  it('finds the "@" being typed', () => {
    expect(typedReference('Serve with @kat', 15)).toEqual({ start: 11, query: 'kat' })
    expect(typedReference('email@kat', 9)).toBeNull()
  })
})

describe('RCP-009: two Variations compared', () => {
  it('marks what differs or one lacks', () => {
    const other = [
      line({ id: 'x', position: 'a', pantry_id: 'p', qty: 100, unit: 'g' }),
      line({ id: 'y', position: 'b', text: 'Honey', qty: 3, unit: 'tbsp' }),
    ]
    expect(compareLines(lines, other, pantry)).toEqual([
      { name: 'Panko', first: '100 g', second: '100 g', differs: false },
      { name: 'Honey', first: '1–2 tbsp', second: '3 tbsp', differs: true },
      { name: 'Salt', first: '', second: null, differs: true },
    ])
  })
})

describe('RCP-013: the log', () => {
  const recipe = {
    item: { id: 'r', created_at: '2026-10-01T09:00:00Z' },
    variations: [{ item: { id: 'v', title: 'Standard' } }],
    cooks: [{ id: 'c', variation_id: 'v', person_id: 'me', cooked_at: '2026-10-05T19:00:00Z' }],
  } as unknown as RecipeView
  const act = (
    id: number,
    at: string,
    item: string,
    changed: Record<string, unknown>,
    verb = 'updated',
  ) => ({ id, item_id: item, verb, changed, at, actor: 'me' }) as Activity
  const activity = [
    act(1, '2026-10-01T09:00:00Z', 'r', { type: 'recipe' }, 'created'),
    act(2, '2026-10-01T09:00:00Z', 'v', { type: 'variation' }, 'created'),
    act(3, '2026-10-04T10:00:00Z', 'v', {
      line: {
        from: { text: 'Honey', qty: 1, unit: 'tbsp', heading: null },
        to: { text: 'Honey', qty: 2, unit: 'tbsp', heading: null },
      },
    }),
    act(4, '2026-10-04T10:05:00Z', 'v', {
      step: { from: { text: 'a', position: 'a' }, to: { text: 'b', position: 'a' } },
    }),
    act(5, '2026-10-06T08:00:00Z', 'r', { cuisine: { from: null, to: 'Japanese' } }),
    act(6, '2026-10-06T09:00:00Z', 'r', { status: { from: 'active', to: 'done' } }),
    act(7, '2026-10-07T09:00:00Z', 'v', { status: { from: 'active', to: 'done' } }),
  ]

  it('lists cooks and edits newest first; edits close together are one, with my note', () => {
    const log = recipeLog(recipe, activity, new Map([[3, 'More honey']]))
    expect(log.map((l) => [l.what, l.detail, l.activity])).toEqual([
      ['Marked Complete', undefined, undefined],
      ['Edited', undefined, 5],
      ['Cooked', undefined, undefined],
      ['Edited', 'More honey', 3],
      ['Added', undefined, undefined],
    ])
  })

  it('narrows to cooks', () => {
    expect(filterLog(recipeLog(recipe, activity), 'cooks').map((l) => l.what)).toEqual(['Cooked'])
  })
})
