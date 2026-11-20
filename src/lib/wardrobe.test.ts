import { describe, expect, it } from 'vitest'
import type { GarmentView, WardrobeEntry, WardrobeLists } from '@/data'
import {
  DEFAULT_WARDROBE_VIEW,
  filterChoices,
  groupGarments,
  matchBrands,
  matchesSearch,
  recentBrands,
  shownGarments,
  sizesFor,
  stillNeeded,
  type WardrobeView,
} from './wardrobe'

const entry = (
  id: string,
  name: string,
  position: string | null = null,
  hex: string | null = null,
): WardrobeEntry => ({
  id,
  name,
  position,
  hex,
})

const LISTS: WardrobeLists = {
  category: [entry('c-tee', 'T-shirt', 'a'), entry('c-jeans', 'Jeans', 'b')],
  size: [entry('s-s', 'S', 'a'), entry('s-m', 'M', 'b'), entry('s-32', '32', 'c')],
  brand: [entry('b-uniqlo', 'Uniqlo'), entry('b-arket', 'Arket'), entry('b-carhartt', 'Carhartt')],
  fit: [entry('f-slim', 'Slim')],
  tag: [entry('t-gym', 'Gym')],
  colour: [entry('k-navy', 'Navy', null, '#1f2a44'), entry('k-white', 'White', null, '#f3f1ec')],
  collection: [],
}

const byId = (list: WardrobeEntry[], id: string | null) => list.find((e) => e.id === id)

function garment(
  id: string,
  f: {
    category: string
    size: string
    brand: string
    colour: string
    fit?: string
    tags?: string[]
  },
  more: { added?: string; retired?: boolean; favourite?: boolean } = {},
): GarmentView {
  const row = {
    item_id: id,
    category_id: f.category,
    size_id: f.size,
    brand_id: f.brand,
    colour_id: f.colour,
    fit_id: f.fit ?? null,
    own_name: null,
  }
  return {
    item: {
      id,
      type: 'garment',
      title: id,
      created_at: more.added ?? '2026-11-01T09:00:00Z',
    } as GarmentView['item'],
    row,
    category: byId(LISTS.category, row.category_id),
    size: byId(LISTS.size, row.size_id),
    brand: byId(LISTS.brand, row.brand_id),
    colour: byId(LISTS.colour, row.colour_id),
    fit: byId(LISTS.fit, row.fit_id),
    tags: (f.tags ?? []).map((t) => byId(LISTS.tag, t)!),
    photo: undefined,
    retired: more.retired ?? false,
    favourite: more.favourite ?? false,
    worn: { times: 0, last: null },
    title: id,
  }
}

const NAVY_TEE = garment(
  'navy-tee',
  {
    category: 'c-tee',
    size: 's-m',
    brand: 'b-uniqlo',
    colour: 'k-navy',
    fit: 'f-slim',
    tags: ['t-gym'],
  },
  { added: '2026-11-03T09:00:00Z', favourite: true },
)
const WHITE_TEE = garment(
  'white-tee',
  { category: 'c-tee', size: 's-s', brand: 'b-arket', colour: 'k-white' },
  { added: '2026-11-02T09:00:00Z' },
)
const JEANS = garment(
  'jeans',
  { category: 'c-jeans', size: 's-32', brand: 'b-uniqlo', colour: 'k-navy' },
  { added: '2026-11-01T09:00:00Z' },
)
const OLD = garment(
  'old',
  { category: 'c-tee', size: 's-m', brand: 'b-carhartt', colour: 'k-white' },
  { retired: true },
)
const ALL = [NAVY_TEE, WHITE_TEE, JEANS, OLD]

const view = (v: Partial<WardrobeView> = {}): WardrobeView => ({
  ...DEFAULT_WARDROBE_VIEW,
  search: '',
  ...v,
})
const ids = (gs: GarmentView[]) => gs.map((g) => g.item.id)

describe('the Wardrobe tab (WRD-001–003)', () => {
  it('shows Owned garments, newest first, never Retired ones', () => {
    expect(ids(shownGarments(ALL, view(), LISTS))).toEqual(['navy-tee', 'white-tee', 'jeans'])
  })

  it('filters by any choice within a filter and every filter together (WRD-002 1)', () => {
    const v = view({ chosen: { Colour: ['Navy', 'White'], Category: ['T-shirt'] } })
    expect(ids(shownGarments(ALL, v, LISTS))).toEqual(['navy-tee', 'white-tee'])
    expect(
      ids(shownGarments(ALL, view({ chosen: { Favourites: ['Favourites'] } }), LISTS)),
    ).toEqual(['navy-tee'])
  })

  it('offers only choices an Owned garment has, in my order (WRD-002 3)', () => {
    const c = filterChoices(ALL, LISTS)
    expect(c.Brand.map((b) => b.name)).toEqual(['Uniqlo', 'Arket'])
    expect(c.Size.map((s) => s.name)).toEqual(['S', 'M', '32'])
    expect(c.Colour.map((s) => s.name)).toEqual(['White', 'Navy'])
    expect(c.Favourites).toHaveLength(1)
  })

  it('sorts by size in my order, and reversed (WRD-003 1)', () => {
    expect(ids(shownGarments(ALL, view({ sort: 'size', sortDir: 'asc' }), LISTS))).toEqual([
      'white-tee',
      'navy-tee',
      'jeans',
    ])
    expect(ids(shownGarments(ALL, view({ sort: 'size', sortDir: 'desc' }), LISTS))).toEqual([
      'jeans',
      'navy-tee',
      'white-tee',
    ])
  })

  it('groups by category in my order, each group with its garments (WRD-003 2)', () => {
    const groups = groupGarments(shownGarments(ALL, view(), LISTS), 'category', LISTS)
    expect(groups.map((g) => [g.label, g.garments.length])).toEqual([
      ['T-shirt', 2],
      ['Jeans', 1],
    ])
  })
})

describe('search (WRD-004)', () => {
  it('matches each word on something the garment has, ignoring case', () => {
    expect(matchesSearch(NAVY_TEE, 'navy SLIM')).toBe(true)
    expect(matchesSearch(JEANS, 'navy slim')).toBe(false)
    expect(matchesSearch(NAVY_TEE, 'gym')).toBe(true)
  })
})

describe('the add sheet (WRD-005, WRD-008)', () => {
  it('puts the sizes used with a category first (WRD-005 4)', () => {
    const { lead, rest } = sizesFor('c-tee', ALL, LISTS.size)
    expect(lead.map((s) => s.name)).toEqual(['S', 'M'])
    expect(rest.map((s) => s.name)).toEqual(['32'])
    expect(sizesFor(undefined, ALL, LISTS.size).lead).toHaveLength(3)
  })

  it('offers my recent brands, then the rest A–Z (WRD-008 1)', () => {
    expect(recentBrands(ALL, LISTS.brand, 3).map((b) => b.name)).toEqual([
      'Uniqlo',
      'Arket',
      'Carhartt',
    ])
  })

  it('narrows brands as I type, those starting with it first (WRD-008 1)', () => {
    expect(matchBrands(LISTS.brand, 'ar').map((b) => b.name)).toEqual(['Arket', 'Carhartt'])
    expect(matchBrands(LISTS.brand, '')).toEqual([])
  })

  it('says what is missing until the four are set (WRD-005 5)', () => {
    expect(stillNeeded({ colour: 'k', category: 'c' })).toBe('Add a size and brand')
    expect(stillNeeded({})).toBe('Add a colour, category, size and brand')
    expect(stillNeeded({ colour: 'k', category: 'c', size: 's', brand: 'b' })).toBeUndefined()
  })
})
