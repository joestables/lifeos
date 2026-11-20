import { compareColours, labToHex } from '@lifeos/wardrobe'
import type { GarmentView, WardrobeEntry, WardrobeLists } from '@/data'
import { directed, type SortDirection } from './sort'

/** The Wardrobe tab's filters, in the order they show (WRD-002 2). */
export const GARMENT_FILTERS = [
  'Category',
  'Brand',
  'Colour',
  'Size',
  'Fit',
  'Tags',
  'Favourites',
] as const
export type GarmentFilter = (typeof GARMENT_FILTERS)[number]

export const FAVOURITES = 'Favourites'

export type GarmentSort = 'added' | 'category' | 'brand' | 'size' | 'worn' | 'times'
export const GARMENT_SORTS: { value: GarmentSort; label: string; initial: SortDirection }[] = [
  { value: 'added', label: 'Recently added', initial: 'desc' },
  { value: 'category', label: 'Category', initial: 'asc' },
  { value: 'brand', label: 'Brand', initial: 'asc' },
  { value: 'size', label: 'Size', initial: 'asc' },
  { value: 'worn', label: 'Last worn', initial: 'desc' },
  { value: 'times', label: 'Times worn', initial: 'desc' },
]

export type GarmentGrouping = 'none' | 'category' | 'brand' | 'size' | 'colour'
export const GARMENT_GROUPINGS: { value: GarmentGrouping; label: string }[] = [
  { value: 'none', label: 'No groups' },
  { value: 'category', label: 'By category' },
  { value: 'brand', label: 'By brand' },
  { value: 'size', label: 'By size' },
  { value: 'colour', label: 'By colour' },
]

/** How the Wardrobe tab is filtered, sorted and grouped, kept for next time (WRD-002–004). */
export interface WardrobeView {
  /** Each filter's chosen values, by name. */
  chosen: Partial<Record<GarmentFilter, string[]>>
  sort: GarmentSort
  sortDir: SortDirection
  group: GarmentGrouping
  search: string
}

export const DEFAULT_WARDROBE_VIEW: Omit<WardrobeView, 'search'> = {
  chosen: {},
  sort: 'added',
  sortDir: 'desc',
  group: 'none',
}

const key = (s: string) => s.trim().toLowerCase()

/** A garment's values for one filter. */
function valuesOf(g: GarmentView, filter: GarmentFilter): string[] {
  switch (filter) {
    case 'Category':
      return g.category ? [g.category.name] : []
    case 'Brand':
      return g.brand ? [g.brand.name] : []
    case 'Colour':
      return g.colour ? [g.colour.name] : []
    case 'Size':
      return g.size ? [g.size.name] : []
    case 'Fit':
      return g.fit ? [g.fit.name] : []
    case 'Tags':
      return g.tags.map((t) => t.name)
    case 'Favourites':
      return g.favourite ? [FAVOURITES] : []
  }
}

/** A colour without its swatch yet sorts as a mid grey. */
const GREY = labToHex({ l: 0.6, a: 0, b: 0 })

/** Colours in their listed order (WRD-002 3). */
export const colourOrder = (colours: readonly WardrobeEntry[]) =>
  [...colours].sort(
    (a, b) => compareColours(a.hex ?? GREY, b.hex ?? GREY) || a.name.localeCompare(b.name),
  )

/**
 * Each filter's choices (WRD-002 3): the entries an Owned garment has, in
 * my order (Category, Size), my colours' order, or A–Z.
 */
export function filterChoices(
  garments: readonly GarmentView[],
  lists: WardrobeLists,
): Record<GarmentFilter, WardrobeEntry[]> {
  const owned = garments.filter((g) => !g.retired)
  const has = (filter: GarmentFilter) => new Set(owned.flatMap((g) => valuesOf(g, filter)))
  const pick = (filter: GarmentFilter, entries: readonly WardrobeEntry[]) => {
    const used = has(filter)
    return entries.filter((e) => used.has(e.name))
  }
  return {
    Category: pick('Category', lists.category),
    Brand: pick('Brand', lists.brand),
    Colour: pick('Colour', colourOrder(lists.colour)),
    Size: pick('Size', lists.size),
    Fit: pick('Fit', lists.fit),
    Tags: pick('Tags', lists.tag),
    Favourites: owned.some((g) => g.favourite)
      ? [{ id: FAVOURITES, name: FAVOURITES, position: null, hex: null }]
      : [],
  }
}

/** Each word of the search matches something the garment has (WRD-004 1). */
export function matchesSearch(g: GarmentView, search: string): boolean {
  const words = key(search).split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const fields = [
    g.category?.name,
    g.brand?.name,
    g.size?.name,
    g.colour?.name,
    g.fit?.name,
    g.row.own_name,
    ...g.tags.map((t) => t.name),
  ]
    .filter((f): f is string => Boolean(f))
    .map(key)
  return words.every((w) => fields.some((f) => f.includes(w)))
}

/**
 * The Owned garments the view shows (WRD-001–004): any choice within a
 * filter, every filter together, the search, then the sort.
 */
export function shownGarments(
  garments: readonly GarmentView[],
  view: WardrobeView,
  lists: WardrobeLists,
): GarmentView[] {
  const out = garments.filter((g) => {
    if (g.retired) return false
    for (const f of GARMENT_FILTERS) {
      const chosen = view.chosen[f]
      if (!chosen?.length) continue
      const mine = valuesOf(g, f).map(key)
      if (!chosen.some((c) => mine.includes(key(c)))) return false
    }
    return matchesSearch(g, view.search)
  })
  const at = (entries: readonly WardrobeEntry[]) => new Map(entries.map((e, i) => [e.id, i]))
  const catAt = at(lists.category)
  const sizeAt = at(lists.size)
  const added = (a: GarmentView, b: GarmentView) =>
    b.item.created_at.localeCompare(a.item.created_at)
  const byPlace =
    (place: Map<string, number>, id: (g: GarmentView) => string) =>
    (a: GarmentView, b: GarmentView) =>
      (place.get(id(a)) ?? Infinity) - (place.get(id(b)) ?? Infinity) || added(a, b)
  const compare: Record<GarmentSort, (a: GarmentView, b: GarmentView) => number> = {
    added,
    category: byPlace(catAt, (g) => g.row.category_id),
    size: byPlace(sizeAt, (g) => g.row.size_id),
    brand: (a, b) => (a.brand?.name ?? '').localeCompare(b.brand?.name ?? '') || added(a, b),
    ...wornSorts(added),
  }
  const initial = GARMENT_SORTS.find((s) => s.value === view.sort)?.initial ?? 'asc'
  return out.sort(directed(compare[view.sort], initial, view.sortDir))
}

/**
 * Garments in groups (WRD-003 2): in the lists' order (colours in theirs),
 * each with how many; the sort holds within each.
 */
export function groupGarments(
  garments: readonly GarmentView[],
  group: GarmentGrouping,
  lists: WardrobeLists,
): { key: string; label: string; garments: GarmentView[] }[] {
  if (group === 'none') return [{ key: 'all', label: '', garments: [...garments] }]
  const entries =
    group === 'colour'
      ? colourOrder(lists.colour)
      : group === 'category'
        ? lists.category
        : group === 'size'
          ? lists.size
          : [...lists.brand].sort((a, b) => a.name.localeCompare(b.name))
  const of = (g: GarmentView) =>
    group === 'colour'
      ? g.row.colour_id
      : group === 'category'
        ? g.row.category_id
        : group === 'size'
          ? g.row.size_id
          : g.row.brand_id
  return entries
    .map((e) => ({ key: e.id, label: e.name, garments: garments.filter((g) => of(g) === e.id) }))
    .filter((g) => g.garments.length > 0)
}

/**
 * The sizes I've used with a category, in my order, leading the Size pills
 * (WRD-005 4); none used, every size.
 */
export function sizesFor(
  category: string | undefined,
  garments: readonly GarmentView[],
  sizes: readonly WardrobeEntry[],
): { lead: WardrobeEntry[]; rest: WardrobeEntry[] } {
  const used = new Set(
    garments.filter((g) => g.row.category_id === category).map((g) => g.row.size_id),
  )
  if (!category || used.size === 0) return { lead: [...sizes], rest: [] }
  return {
    lead: sizes.filter((s) => used.has(s.id)),
    rest: sizes.filter((s) => !used.has(s.id)),
  }
}

/** The brands I've used most recently, up to six (WRD-008 1). */
export function recentBrands(
  garments: readonly GarmentView[],
  brands: readonly WardrobeEntry[],
  count = 6,
): WardrobeEntry[] {
  const byId = new Map(brands.map((b) => [b.id, b]))
  const out: WardrobeEntry[] = []
  for (const g of [...garments].sort((a, b) =>
    b.item.created_at.localeCompare(a.item.created_at),
  )) {
    const b = byId.get(g.row.brand_id)
    if (b && !out.includes(b)) out.push(b)
    if (out.length === count) break
  }
  // Too few garments yet: my other brands, A–Z, fill the row.
  for (const b of [...brands].sort((x, y) => x.name.localeCompare(y.name))) {
    if (out.length >= count) break
    if (!out.includes(b)) out.push(b)
  }
  return out
}

/** Brands matching what is typed, those starting with it first (WRD-008 1). */
export function matchBrands(brands: readonly WardrobeEntry[], typed: string): WardrobeEntry[] {
  const t = key(typed)
  if (!t) return []
  return brands
    .filter((b) => key(b.name).includes(t))
    .sort(
      (a, b) =>
        Number(!key(a.name).startsWith(t)) - Number(!key(b.name).startsWith(t)) ||
        a.name.localeCompare(b.name),
    )
}

/** What a new garment still needs before Save (WRD-005 5): "Add a size and brand". */
export function stillNeeded(fields: {
  category?: string
  size?: string
  brand?: string
  colour?: string
}): string | undefined {
  const missing = (
    [
      ['colour', fields.colour],
      ['category', fields.category],
      ['size', fields.size],
      ['brand', fields.brand],
    ] as const
  )
    .filter(([, v]) => !v)
    .map(([n]) => n)
  if (!missing.length) return undefined
  const last = missing.pop()!
  return `Add a ${missing.length ? `${missing.join(', ')} and ${last}` : last}`
}

/**
 * Last worn (latest first; never worn last) and times worn (most first),
 * for garments and outfits alike (WRD-003 1, WRD-016 4; WRD-024 2).
 */
export function wornSorts<T extends { worn: { times: number; last: string | null } }>(
  then: (a: T, b: T) => number,
) {
  return {
    worn: (a: T, b: T) => (b.worn.last ?? '').localeCompare(a.worn.last ?? '') || then(a, b),
    times: (a: T, b: T) => b.worn.times - a.worn.times || then(a, b),
  }
}
