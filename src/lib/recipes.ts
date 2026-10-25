import { formatAmount, type Unit } from '@lifeos/food'
import type { FoodValue, Line, PantryEntry, ValueKind } from '@/data'
import type { RecipeView } from '@/data/food-hooks'
import { directed, type SortDirection } from './sort'

/** All · Draft · Complete (RCP-001 2). */
export type StateFilter = 'draft' | 'complete' | 'all'
export type Sort = 'added' | 'cooked' | 'name'
export type Grouping = 'none' | 'category' | 'cuisine' | 'state'

/** The filters that narrow by a Recipe's heading, each any of its values. */
export const FILTERS = [
  'Category',
  'Cuisine',
  'Tags',
  'Protein',
  'Carbs',
  'Created by',
  'Favourites',
] as const
export type FilterName = (typeof FILTERS)[number]

export interface LibraryView {
  state: StateFilter
  chosen: Partial<Record<FilterName, string[]>>
  search: string
  sort: Sort
  /** The sort's way (RCP-001 6): its own to start, reversed by choosing it again. */
  sortDir: SortDirection
  group: Grouping
}

export const DEFAULT_VIEW: LibraryView = {
  state: 'all',
  chosen: {},
  search: '',
  sort: 'added',
  sortDir: 'desc',
  group: 'none',
}

export const SORTS: { value: Sort; label: string; initial: SortDirection }[] = [
  { value: 'added', label: 'Recently added', initial: 'desc' },
  { value: 'cooked', label: 'Recently cooked', initial: 'desc' },
  { value: 'name', label: 'A–Z', initial: 'asc' },
]

export const GROUPINGS: { value: Grouping; label: string }[] = [
  { value: 'none', label: 'No groups' },
  { value: 'category', label: 'By category' },
  { value: 'cuisine', label: 'By cuisine' },
  { value: 'state', label: 'By state' },
]

export const MINE = 'Mine'

/** A Recipe's values for one filter. */
/** Whose a Recipe is, by name ("Me", "Sam Carter"), for Created by (RCP-001 5). */
export type Author = (r: RecipeView) => string

function valuesOf(r: RecipeView, name: FilterName, author?: Author): string[] {
  const h = r.heading
  switch (name) {
    case 'Category':
      return h.category ? [h.category] : []
    case 'Cuisine':
      return h.cuisine ? [h.cuisine] : []
    case 'Tags':
      return h.tags
    case 'Protein':
      return h.protein
    case 'Carbs':
      return h.carbs
    case 'Created by':
      return author ? [author(r)] : []
    case 'Favourites':
      return r.favourite ? [MINE] : []
  }
}

const key = (s: string) => s.trim().toLowerCase()

/** The library's Recipes: Draft and Complete, never Ideas or Archived (RCP-001 1). */
export const inLibrary = (r: RecipeView) => r.state === 'active' || r.state === 'done'
/** The Ideas tab (RCP-002 2). */
export const isIdea = (r: RecipeView) => r.state === 'idea'

/**
 * Each filter's values among the Recipes shown, the same name counting once
 * whatever its case (RCP-017 5), A–Z.
 */
export function filterValues(
  recipes: readonly RecipeView[],
  author?: Author,
): Record<FilterName, string[]> {
  const out = {} as Record<FilterName, string[]>
  for (const name of FILTERS) {
    const seen = new Map<string, string>()
    for (const r of recipes)
      for (const v of valuesOf(r, name, author)) if (!seen.has(key(v))) seen.set(key(v), v)
    out[name] = [...seen.values()].sort((a, b) => a.localeCompare(b))
  }
  return out
}

/** The name of a line's ingredient: its Pantry entry's, or as typed. */
export function lineName(
  line: Pick<Line, 'pantry_id' | 'text'>,
  pantry: ReadonlyMap<string, PantryEntry>,
): string {
  return (line.pantry_id && pantry.get(line.pantry_id)?.name) || line.text || ''
}

/** "200 g", "1–2 tbsp", "~5 g", or "" for a line without an amount. */
export function lineAmount(line: Pick<Line, 'qty' | 'qty_max' | 'approx' | 'unit'>): string {
  return formatAmount({
    qty: line.qty,
    qtyMax: line.qty_max,
    approx: line.approx,
    unit: (line.unit as Unit | null) ?? null,
  })
}

/**
 * Whether a Recipe matches the search: by name, tag or ingredient
 * (RCP-001 3), every word somewhere.
 */
export function matches(
  r: RecipeView,
  search: string,
  pantry: ReadonlyMap<string, PantryEntry>,
): boolean {
  const words = key(search).split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const haystack = [
    r.item.title,
    ...r.heading.tags,
    r.heading.cuisine ?? '',
    r.heading.category ?? '',
    ...r.variations.flatMap((v) => v.lines.map((l) => lineName(l, pantry))),
  ]
    .join(' ')
    .toLowerCase()
  return words.every((w) => haystack.includes(w))
}

const lastCooked = (r: RecipeView) => r.cooks[0]?.cooked_at ?? ''

/** The library as chosen: state, filters, search, then sorted (RCP-001 2–6). */
export function libraryRecipes(
  recipes: readonly RecipeView[],
  view: LibraryView,
  pantry: ReadonlyMap<string, PantryEntry>,
  author?: Author,
): RecipeView[] {
  // Created by counts only in a Household, when there is an author to ask.
  const chosen = Object.entries(view.chosen).filter(
    ([name, vs]) => vs?.length && (name !== 'Created by' || author),
  ) as [FilterName, string[]][]
  return recipes
    .filter(inLibrary)
    .filter(
      (r) =>
        view.state === 'all' ||
        (view.state === 'draft' ? r.state === 'active' : r.state === 'done'),
    )
    .filter((r) =>
      chosen.every(([name, vs]) => {
        const has = new Set(valuesOf(r, name, author).map(key))
        return vs.some((v) => has.has(key(v)))
      }),
    )
    .filter((r) => matches(r, view.search, pantry))
    .sort(
      directed(
        (a, b) => {
          if (view.sort === 'name') return a.item.title.localeCompare(b.item.title)
          if (view.sort === 'cooked') {
            const d = lastCooked(b).localeCompare(lastCooked(a))
            if (d) return d
          }
          return b.item.created_at.localeCompare(a.item.created_at)
        },
        SORTS.find((o) => o.value === view.sort)?.initial ?? 'desc',
        view.sortDir ?? 'desc',
      ),
    )
}

const STATE_NAMES: Record<string, string> = { done: 'Complete', active: 'Draft' }

/** Groups in A–Z order, those without a value last ("No cuisine"). */
export function groupRecipes(
  recipes: readonly RecipeView[],
  group: Grouping,
): { key: string; label: string; recipes: RecipeView[] }[] {
  if (group === 'none') return [{ key: 'all', label: '', recipes: [...recipes] }]
  const label = (r: RecipeView) =>
    group === 'state'
      ? (STATE_NAMES[r.state] ?? '')
      : ((group === 'category' ? r.heading.category : r.heading.cuisine) ?? '')
  const out = new Map<string, { key: string; label: string; recipes: RecipeView[] }>()
  for (const r of recipes) {
    const l = label(r)
    const k = key(l)
    const g = out.get(k) ?? {
      key: k || '~',
      label: l || (group === 'category' ? 'No category' : 'No cuisine'),
      recipes: [],
    }
    g.recipes.push(r)
    out.set(k, g)
  }
  return [...out.values()].sort((a, b) =>
    a.key === '~'
      ? 1
      : b.key === '~'
        ? -1
        : group === 'state'
          ? a.key < b.key
            ? -1
            : 1
          : a.label.localeCompare(b.label),
  )
}

/** "tiktok.com" from a link, or the link itself when it isn't one. */
export function sourceHost(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, '')
  } catch {
    return link
  }
}

export type IdeaSort = 'added' | 'name'

export const IDEA_SORTS: { value: IdeaSort; label: string; initial: SortDirection }[] = [
  { value: 'added', label: 'Recently added', initial: 'desc' },
  { value: 'name', label: 'A–Z', initial: 'asc' },
]

/** Ideas newest first or A–Z, either way round, matched by name or note (RCP-002 2). */
export function ideaRecipes(
  recipes: readonly RecipeView[],
  search: string,
  sort: IdeaSort = 'added',
  direction?: SortDirection,
): RecipeView[] {
  const initial = IDEA_SORTS.find((o) => o.value === sort)?.initial ?? 'desc'
  const words = key(search).split(/\s+/).filter(Boolean)
  return recipes
    .filter(isIdea)
    .filter((r) => {
      const text = `${r.item.title} ${r.defaultVariation?.fields.notes ?? ''}`.toLowerCase()
      return words.every((w) => text.includes(w))
    })
    .sort(
      directed(
        (a, b) =>
          sort === 'name'
            ? a.item.title.localeCompare(b.item.title)
            : b.item.created_at.localeCompare(a.item.created_at),
        initial,
        direction ?? initial,
      ),
    )
}

/** A name a Recipe I can see already has, ignoring case and spaces (RCP-006 6). */
export function nameTaken(
  recipes: readonly RecipeView[],
  name: string,
  except?: string,
): RecipeView | undefined {
  const k = key(name).replace(/\s+/g, ' ')
  return recipes.find((r) => r.item.id !== except && key(r.item.title).replace(/\s+/g, ' ') === k)
}

const HEADING_FIELD = {
  category: 'category',
  cuisine: 'cuisine',
  tag: 'tags',
  protein: 'protein',
  carb: 'carbs',
} as const

/**
 * A list's choices: my values of that kind and those on Recipes I can see,
 * each name once whatever its case (RCP-006 5, RCP-017), A–Z.
 */
export function valueChoices(
  values: readonly FoodValue[],
  recipes: readonly RecipeView[],
  kind: ValueKind,
): string[] {
  const seen = new Map<string, string>()
  const add = (v: string | null) => {
    if (v && v.trim() && !seen.has(key(v))) seen.set(key(v), v.trim())
  }
  for (const v of values) if (v.kind === kind) add(v.name)
  for (const r of recipes) {
    const h = r.heading[HEADING_FIELD[kind]]
    for (const v of Array.isArray(h) ? h : [h]) add(v)
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

/** A link as compared for "saved before": no scheme, www, fragment, tracking or trailing slash. */
export function linkKey(link: string): string {
  try {
    const url = new URL(link.trim())
    for (const k of [...url.searchParams.keys()])
      if (/^(utm_|fbclid|gclid|igsh|si$)/.test(k)) url.searchParams.delete(k)
    const search = url.searchParams.toString()
    return `${url.hostname.replace(/^(www|m)\./, '')}${url.pathname.replace(/\/+$/, '')}${search ? `?${search}` : ''}`.toLowerCase()
  } catch {
    return link.trim().toLowerCase()
  }
}

/** The Recipe or Idea I can see that already has this link as a source (RCP-014 5). */
export function savedWith<R extends { variations: { fields: { sources: string[] } }[] }>(
  recipes: readonly R[],
  link: string,
): R | undefined {
  const key = linkKey(link)
  return recipes.find((r) =>
    r.variations.some((v) => v.fields.sources.some((s) => linkKey(s) === key)),
  )
}
