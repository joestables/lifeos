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

/** What the Pantry shows (PAN-001 1): everything, my staples, or those run out. */
export type PantryShow = 'all' | 'staples' | 'out'

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

/** "Used in Katsu curry", "Used in Katsu curry and 2 more" (PAN-001 4). */
export function usedIn(recipes: readonly PantryRecipe[]): string {
  const [first, ...rest] = recipes
  if (!first) return ''
  return rest.length ? `Used in ${first.name} and ${rest.length} more` : `Used in ${first.name}`
}

/**
 * The Pantry as shown (PAN-001 1): ingredients by aisle, in aisle order,
 * then household items, each A–Z; narrowed by what is shown and the search.
 */
export function pantryGroups(
  entries: readonly PantryLine[],
  staples: ReadonlyMap<string, { out: boolean }>,
  show: PantryShow,
  search: string,
): { aisles: { aisle: Aisle; label: string; entries: PantryLine[] }[]; household: PantryLine[] } {
  const q = nameKey(search)
  const shown = entries
    .filter((e) => !q || nameKey(e.name).includes(q))
    .filter((e) =>
      show === 'all' ? true : show === 'staples' ? staples.has(e.id) : staples.get(e.id)?.out,
    )
    .sort((a, b) => a.name.localeCompare(b.name))
  const aisles = (Object.keys(AISLES) as Aisle[])
    .map((aisle) => ({
      aisle,
      label: AISLES[aisle],
      entries: shown.filter((e) => e.kind === 'ingredient' && (e.aisle ?? 'cupboard') === aisle),
    }))
    .filter((a) => a.entries.length)
  return { aisles, household: shown.filter((e) => e.kind === 'household') }
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
