import { describe, expect, it } from 'vitest'
import type { Line, PantryEntry } from '@/data'
import type { RecipeView } from '@/data/food-hooks'
import {
  DEFAULT_VIEW,
  filterValues,
  groupRecipes,
  ideaRecipes,
  libraryRecipes,
  lineAmount,
  nameTaken,
  sourceHost,
} from './recipes'

let n = 0
function recipe(
  title: string,
  state: RecipeView['state'],
  extra: {
    cuisine?: string
    category?: string
    tags?: string[]
    favourite?: boolean
    cooked?: string
    lines?: Partial<Line>[]
    notes?: string
  } = {},
): RecipeView {
  n += 1
  const at = `2026-10-${String(n).padStart(2, '0')}T12:00:00Z`
  const item = { id: `r${n}`, title, type: 'recipe', status: state, created_at: at, owner_id: 'me' }
  const lines = (extra.lines ?? []).map(
    (l, i) => ({ id: `l${n}${i}`, variation_id: `v${n}`, ...l }) as Line,
  )
  const variation = {
    item: { id: `v${n}`, status: state },
    fields: { notes: extra.notes ?? null, sources: [] },
    lines,
    steps: [],
    cooks: [],
    mine: true,
  }
  return {
    item,
    heading: {
      item_id: item.id,
      category: extra.category ?? null,
      cuisine: extra.cuisine ?? null,
      tags: extra.tags ?? [],
      protein: [],
      carbs: [],
      default_variation: `v${n}`,
    },
    variations: [variation],
    defaultVariation: variation,
    state,
    mine: true,
    favourite: extra.favourite ?? false,
    cooks: extra.cooked ? [{ cooked_at: extra.cooked }] : [],
  } as unknown as RecipeView
}

const pantry = new Map<string, PantryEntry>([
  [
    'p',
    {
      id: 'p',
      name: 'Panko breadcrumbs',
      kind: 'ingredient',
      aisle: 'cupboard',
      default_unit: 'g',
      added_by: 'me',
    },
  ],
])

const katsu = recipe('Katsu curry', 'done', {
  cuisine: 'Japanese',
  category: 'Dinner',
  tags: ['Quick'],
  favourite: true,
  cooked: '2026-10-10T18:00:00Z',
  lines: [{ pantry_id: 'p', qty: 100, unit: 'g' }],
})
const noodles = recipe('Gochujang noodles', 'active', {
  cuisine: 'Korean',
  category: 'Dinner',
  tags: ['quick'],
})
const shakshuka = recipe('Shakshuka', 'done', { cuisine: 'North African', category: 'Breakfast' })
const birria = recipe('Birria tacos', 'idea', { notes: 'Find one without the slow cooker' })
const old = recipe('Old stew', 'cancelled')
const all = [katsu, noodles, shakshuka, birria, old]

describe('RCP-001: the library', () => {
  it('shows Draft and Complete Recipes, never Ideas or Archived, newest first', () => {
    expect(libraryRecipes(all, DEFAULT_VIEW, pantry).map((r) => r.item.title)).toEqual([
      'Shakshuka',
      'Gochujang noodles',
      'Katsu curry',
    ])
  })

  it('narrows to Draft or Complete (2)', () => {
    const titles = (state: 'draft' | 'complete') =>
      libraryRecipes(all, { ...DEFAULT_VIEW, state }, pantry).map((r) => r.item.title)
    expect(titles('draft')).toEqual(['Gochujang noodles'])
    expect(titles('complete')).toEqual(['Shakshuka', 'Katsu curry'])
  })

  it('finds by name, tag or ingredient (3)', () => {
    const find = (search: string) =>
      libraryRecipes(all, { ...DEFAULT_VIEW, search }, pantry).map((r) => r.item.title)
    expect(find('katsu')).toEqual(['Katsu curry'])
    expect(find('QUICK')).toEqual(['Gochujang noodles', 'Katsu curry'])
    expect(find('panko')).toEqual(['Katsu curry'])
  })

  it('filters any of a filter, every filter together (4); favourites are mine (RCP-015)', () => {
    const view = {
      ...DEFAULT_VIEW,
      chosen: { Category: ['dinner'], Cuisine: ['Korean', 'Japanese'] },
    }
    expect(libraryRecipes(all, view, pantry)).toHaveLength(2)
    const both = { ...view, chosen: { ...view.chosen, Favourites: ['Mine'] } }
    expect(libraryRecipes(all, both, pantry).map((r) => r.item.title)).toEqual(['Katsu curry'])
  })

  it('offers each value once, whatever its case (RCP-017 5)', () => {
    expect(filterValues(all).Tags).toEqual(['Quick'])
    expect(filterValues(all).Cuisine).toEqual(['Japanese', 'Korean', 'North African'])
    expect(filterValues(all).Favourites).toEqual(['Mine'])
  })

  it('sorts by recently cooked, then added, or A–Z; groups (6)', () => {
    const cooked = libraryRecipes(all, { ...DEFAULT_VIEW, sort: 'cooked' }, pantry)
    expect(cooked[0]!.item.title).toBe('Katsu curry')
    const byName = libraryRecipes(all, { ...DEFAULT_VIEW, sort: 'name', sortDir: 'asc' }, pantry)
    expect(byName.map((r) => r.item.title)).toEqual([
      'Gochujang noodles',
      'Katsu curry',
      'Shakshuka',
    ])
    // Either way round.
    const zToA = libraryRecipes(all, { ...DEFAULT_VIEW, sort: 'name', sortDir: 'desc' }, pantry)
    expect(zToA.map((r) => r.item.title)).toEqual(['Shakshuka', 'Katsu curry', 'Gochujang noodles'])
    const oldest = libraryRecipes(all, { ...DEFAULT_VIEW, sortDir: 'asc' }, pantry)
    expect(oldest.map((r) => r.item.title)).toEqual(
      libraryRecipes(all, DEFAULT_VIEW, pantry)
        .map((r) => r.item.title)
        .reverse(),
    )
    expect(groupRecipes(byName, 'category').map((g) => [g.label, g.recipes.length])).toEqual([
      ['Breakfast', 1],
      ['Dinner', 2],
    ])
    expect(groupRecipes(byName, 'state').map((g) => g.label)).toEqual(['Complete', 'Draft'])
  })
})

describe('RCP-002: Ideas', () => {
  it('lists Ideas, matched by name or note', () => {
    expect(ideaRecipes(all, '').map((r) => r.item.title)).toEqual(['Birria tacos'])
    expect(ideaRecipes(all, 'slow cooker')).toHaveLength(1)
    expect(ideaRecipes(all, 'katsu')).toHaveLength(0)
  })

  it('shows where a link came from', () => {
    expect(sourceHost('https://www.tiktok.com/@kian/video/1')).toBe('tiktok.com')
    expect(sourceHost('not a link')).toBe('not a link')
  })
})

describe('RCP-006 6: a name in use is refused', () => {
  it('ignores case and spaces, but not the Recipe itself', () => {
    expect(nameTaken(all, ' katsu  CURRY')?.item.title).toBe('Katsu curry')
    expect(nameTaken(all, 'Katsu curry', katsu.item.id)).toBeUndefined()
  })
})

describe('RCP-005: amounts as read', () => {
  it('shows ranges and approximate amounts', () => {
    expect(lineAmount({ qty: 1, qty_max: 2, approx: false, unit: 'tbsp' })).toBe('1–2 tbsp')
    expect(lineAmount({ qty: 5, qty_max: null, approx: true, unit: 'g' })).toBe('~5 g')
    expect(lineAmount({ qty: null, qty_max: null, approx: false, unit: null })).toBe('')
  })
})
