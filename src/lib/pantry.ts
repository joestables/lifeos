import { directed, type SortDirection } from './sort'

/** The Pantry's aisles, in shopping order (ADR-0012, PAN-001). */
export const AISLES = {
  fruit_veg: 'Fruit & Veg',
  bakery: 'Bakery',
  protein: 'Protein',
  chilled: 'Chilled',
  cupboard: 'Cupboard',
  frozen: 'Frozen',
} as const

export type Aisle = keyof typeof AISLES

/** A Pantry entry as the Pantry needs it. */
export interface PantryLine {
  id: string
  name: string
  kind: string
  aisle: string | null
  default_unit: string | null
  added_by: string | null
}

/** A Recipe as the Pantry needs it: its name, and each Variation's lines. */
export interface PantryRecipe {
  id: string
  name: string
  mine: boolean
  variations: {
    id: string
    mine: boolean
    lines: { id: string; pantry_id: string | null; text: string | null; heading: string | null }[]
  }[]
}

/** The key a name is matched by, as the database's: trimmed, single spaces, any case. */
export const nameKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase()

/** Which Recipes use each entry, each once, A–Z (PAN-001 1, 5). */
export function recipesUsing(recipes: readonly PantryRecipe[]): Map<string, PantryRecipe[]> {
  const out = new Map<string, PantryRecipe[]>()
  for (const r of [...recipes].sort((a, b) => a.name.localeCompare(b.name))) {
    const ids = new Set(r.variations.flatMap((v) => v.lines.map((l) => l.pantry_id)))
    for (const id of ids) {
      if (!id) continue
      const list = out.get(id)
      if (list) list.push(r)
      else out.set(id, [r])
    }
  }
  return out
}

/** Which Meals' own lines use each entry (MPL-006 1), each once, A–Z. */
export function mealsUsing(
  meals: readonly { id: string; name: string; lines: readonly { pantry_id: string | null }[] }[],
): Map<string, { id: string; name: string }[]> {
  const out = new Map<string, { id: string; name: string }[]>()
  for (const m of [...meals].sort((a, b) => a.name.localeCompare(b.name))) {
    for (const id of new Set(m.lines.map((l) => l.pantry_id))) {
      if (!id) continue
      const list = out.get(id)
      if (list) list.push(m)
      else out.set(id, [m])
    }
  }
  return out
}

/**
 * "Used in Katsu curry", "Used in Katsu curry and 2 more" (PAN-001 4):
 * Recipes first, then Meals.
 */
export function usedIn(uses: readonly { name: string }[]): string {
  const [first, ...rest] = uses
  if (!first) return ''
  return rest.length ? `Used in ${first.name} and ${rest.length} more` : `Used in ${first.name}`
}

export type PantrySort = 'aisle' | 'recent' | 'popular' | 'name'

/** The Pantry's sorts (PAN-001 1), each its own way to start. */
export const PANTRY_SORTS: { value: PantrySort; label: string; initial: SortDirection }[] = [
  { value: 'aisle', label: 'By aisle', initial: 'asc' },
  { value: 'recent', label: 'Recently used', initial: 'desc' },
  { value: 'popular', label: 'Most popular', initial: 'desc' },
  { value: 'name', label: 'A–Z', initial: 'asc' },
]

/** How an entry is used: by how many Recipes and Meals, and when last. */
export interface PantryUse {
  count: number
  /** The latest day or time of a Recipe, Meal or shop with it; "" for never. */
  last: string
}

type Used = { when: string; lines: readonly { pantry_id: string | null }[] }

/**
 * Each entry's use (Joe, 25 October): Recipes and Meals count towards Most
 * popular; Recipes, Meals and shops towards Recently used, by a Recipe's
 * last change, a Meal's day and a shop's date (or when it was made).
 */
export function pantryUse(
  recipes: readonly Used[],
  meals: readonly Used[],
  shops: readonly Used[],
): Map<string, PantryUse> {
  const out = new Map<string, PantryUse>()
  const add = (u: Used, counts: boolean) => {
    for (const id of new Set(u.lines.map((l) => l.pantry_id))) {
      if (!id) continue
      const was = out.get(id) ?? { count: 0, last: '' }
      out.set(id, {
        count: was.count + (counts ? 1 : 0),
        last: u.when > was.last ? u.when : was.last,
      })
    }
  }
  for (const r of recipes) add(r, true)
  for (const m of meals) add(m, true)
  for (const s of shops) add(s, false)
  return out
}

export interface PantryShown {
  /** By aisle: each aisle's entries; otherwise one group, unnamed. */
  groups: { key: string; label: string; entries: PantryLine[] }[]
  household: PantryLine[]
}

/**
 * The Pantry as shown (PAN-001 1): narrowed by the search, then by aisle
 * (in aisle order, each A–Z), by when last used, by how many use it, or
 * A–Z, either way round; household items apart, sorted the same.
 */
export function pantryShown(
  entries: readonly PantryLine[],
  search: string,
  sort: PantrySort = 'aisle',
  direction: SortDirection = 'asc',
  use: ReadonlyMap<string, PantryUse> = new Map(),
): PantryShown {
  const q = nameKey(search)
  const byName = (a: PantryLine, b: PantryLine) => a.name.localeCompare(b.name)
  const compare =
    sort === 'recent'
      ? (a: PantryLine, b: PantryLine) =>
          (use.get(b.id)?.last ?? '').localeCompare(use.get(a.id)?.last ?? '') || byName(a, b)
      : sort === 'popular'
        ? (a: PantryLine, b: PantryLine) =>
            (use.get(b.id)?.count ?? 0) - (use.get(a.id)?.count ?? 0) || byName(a, b)
        : byName
  const initial = PANTRY_SORTS.find((o) => o.value === sort)?.initial ?? 'asc'
  const shown = entries
    .filter((e) => !q || nameKey(e.name).includes(q))
    .sort(directed(compare, initial, direction))
  const ingredients = shown.filter((e) => e.kind === 'ingredient')
  const household = shown.filter((e) => e.kind === 'household')
  if (sort !== 'aisle')
    return {
      groups: ingredients.length
        ? [{ key: 'all', label: 'Ingredients', entries: ingredients }]
        : [],
      household,
    }
  const order = Object.keys(AISLES) as Aisle[]
  if (direction === 'desc') order.reverse()
  return {
    groups: order
      .map((aisle) => ({
        key: aisle,
        label: AISLES[aisle],
        entries: ingredients.filter((e) => (e.aisle ?? 'cupboard') === aisle),
      }))
      .filter((a) => a.entries.length),
    household,
  }
}

/** A name kept as typed in my Recipes' lines, to add to the Pantry (PAN-004 2). */
export interface TypedName {
  name: string
  /** My lines with it, by Variation. */
  lines: { variation: string; line: string }[]
  /** How many of my Recipes use it. */
  recipes: number
}

/**
 * The names my Recipes' lines kept as typed, A–Z, each once (by any case);
 * one the Pantry has since gained is left out, as it is offered on its line.
 */
export function typedNames(
  recipes: readonly PantryRecipe[],
  entries: readonly PantryLine[],
): TypedName[] {
  const inPantry = new Set(entries.map((e) => nameKey(e.name)))
  const out = new Map<string, TypedName & { ids: Set<string> }>()
  for (const r of recipes) {
    for (const v of r.variations) {
      if (!v.mine) continue
      for (const l of v.lines) {
        if (l.heading || l.pantry_id || !l.text?.trim()) continue
        const key = nameKey(l.text)
        if (inPantry.has(key)) continue
        const t = out.get(key) ?? { name: l.text.trim(), lines: [], recipes: 0, ids: new Set() }
        t.lines.push({ variation: v.id, line: l.id })
        t.ids.add(r.id)
        t.recipes = t.ids.size
        out.set(key, t)
      }
    }
  }
  return [...out.values()]
    .map(({ name, lines, recipes: n }) => ({ name, lines, recipes: n }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** The other entries I added of the same kind, A–Z: what `entry` may merge with (PAN-003 2). */
export function mergeable<T extends PantryLine>(
  entry: T,
  pantry: ReadonlyMap<string, T>,
  me: string,
): T[] {
  return [...pantry.values()]
    .filter((p) => p.id !== entry.id && p.added_by === me && p.kind === entry.kind)
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Pantry entries for a typed name: names starting with it first, up to six. */
export function pantryMatches<P extends PantryLine>(
  pantry: ReadonlyMap<string, P>,
  query: string,
): P[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return [...pantry.values()]
    .filter((p) => p.name.toLowerCase().includes(q))
    .sort((a, b) => {
      const x = a.name.toLowerCase().startsWith(q) ? 0 : 1
      const y = b.name.toLowerCase().startsWith(q) ? 0 : 1
      return x - y || a.name.localeCompare(b.name)
    })
    .slice(0, 6)
}
