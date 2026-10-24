import type { Database } from './database.types'
import type { QueueEntry } from './queue/store'
import { supabase } from './supabase'

type Food = Database['food']['Tables']

/** A Recipe's heading beyond its name (food.recipe; ADR-0052). */
export type RecipeHeading = Omit<Food['recipe']['Row'], 'updated_at'>
/** A Variation's fields beyond its name and state (food.variation). */
export type VariationFields = Omit<Food['variation']['Row'], 'updated_at'>
/** An ingredient line, or a subheading when it has a heading (RCP-007). */
export type Line = Omit<Food['variation_lines']['Row'], 'created_at' | 'updated_at'>
/** A method step (RCP-008). */
export type Step = Omit<Food['variation_steps']['Row'], 'created_at' | 'updated_at'>
/** A cook, with its snapshot of the Variation as cooked (RCP-012). */
export type Cook = Omit<Food['cooks']['Row'], 'updated_at'>
/** A Pantry entry (PAN-001). */
export type PantryEntry = Omit<Food['pantry']['Row'], 'created_at' | 'updated_at'>
/** A Meal's own fields beyond its Item (MPL-002): servings, and what it is leftovers of. */
export type MealRow = Omit<Food['meal']['Row'], 'updated_at'>
/** What a new Meal is made with (MPL-002). */
export interface MealFields {
  title: string
  do_on: string
  slot: 'breakfast' | 'lunch' | 'dinner'
  space_id?: string
  variation?: string
  servings?: number | null
  leftovers_of?: string
  /** A typed Meal's recipe link (MPL-006 2). */
  source?: string
}
/** A Meal's own ingredient line (MPL-006): no subheadings. */
export type MealLine = Omit<Food['meal_lines']['Row'], 'created_at' | 'updated_at'>
export type MealLineFields = Partial<
  Pick<MealLine, 'position' | 'pantry_id' | 'text' | 'qty' | 'qty_max' | 'approx' | 'unit'>
>
/** A staple of one of my Spaces, and whether it has run out (PAN-002). */
/** The Pantry's staples as Stage 4 built them; Essentials and kinds arrive with Shopping (step 5). */
export type Staple = Pick<Food['staples']['Row'], 'space_id' | 'pantry_id' | 'out_of_stock'>
/** What a Pantry entry is made or changed with (PAN-001). */
export type PantryFields = Partial<Pick<PantryEntry, 'name' | 'kind' | 'aisle' | 'default_unit'>>
/** A name in someone's list of categories, cuisines, tags, protein or carbs. */
export type FoodValue = Food['values']['Row']
export type ValueKind = 'category' | 'cuisine' | 'tag' | 'protein' | 'carb'

export type HeadingPatch = Partial<
  Pick<RecipeHeading, 'category' | 'cuisine' | 'tags' | 'protein' | 'carbs' | 'default_variation'>
>
export type VariationPatch = Partial<
  Pick<VariationFields, 'servings' | 'prep_min' | 'cook_min' | 'sources' | 'notes'>
>
export type LineFields = Partial<
  Pick<Line, 'position' | 'heading' | 'pantry_id' | 'text' | 'qty' | 'qty_max' | 'approx' | 'unit'>
>
export type CookFields = Partial<
  Pick<Cook, 'cooked_at' | 'verdict' | 'notes' | 'servings' | 'meal_id'>
>

export const recipesKey = ['food', 'recipe'] as const
export const variationsKey = ['food', 'variation'] as const
export const linesKey = ['food', 'variation_lines'] as const
export const stepsKey = ['food', 'variation_steps'] as const
export const cooksKey = ['food', 'cooks'] as const
export const pantryKey = ['food', 'pantry'] as const
export const valuesKey = ['food', 'values'] as const
export const staplesKey = ['food', 'staples'] as const
export const mealsKey = ['food', 'meal'] as const
export const mealLinesKey = ['food', 'meal_lines'] as const
/** My personal Space's id: where my staples are kept until Households (PAN-002 1). */
export const personalSpaceKey = ['core', 'spaces', 'personal'] as const
/** A Recipe's log (RCP-013): the activity of it and its Variations. */
export const activityKey = (ids: readonly string[]) => ['core', 'activity', ...ids] as const

const food = () => supabase().schema('food')

/** An entry of the activity log (ADR-0030), written only by triggers. */
export type Activity = Omit<Database['core']['Tables']['activity']['Row'], 'changed'> & {
  changed: Record<string, { from?: unknown; to?: unknown } | unknown>
}

/** What happened to these Items, newest first: the latest 200. */
export async function fetchActivity(ids: readonly string[]): Promise<Activity[]> {
  if (!ids.length) return []
  const { data, error } = await supabase()
    .from('activity')
    .select('id, item_id, verb, changed, at, actor')
    .in('item_id', [...ids])
    .order('at', { ascending: false })
    .limit(500)
  if (error) throw error
  return data as Activity[]
}

/** Notes on changes (RCP-013): each change's own words, by its first activity entry. */
export const changeNotesKey = (ids: readonly string[]) => ['food', 'change_notes', ...ids] as const

export async function fetchChangeNotes(
  ids: readonly string[],
): Promise<{ activity_id: number; note: string }[]> {
  if (!ids.length) return []
  const { data, error } = await food()
    .from('change_notes')
    .select('activity_id, note')
    .in('item_id', [...ids])
  if (error) throw error
  return data
}

/** Notes with unsent ones laid over. */
export function applyPendingNotes(
  rows: readonly { activity_id: number; note: string }[],
  entries: readonly QueueEntry[],
): Map<number, string> {
  const out = new Map(rows.map((r) => [r.activity_id, r.note]))
  for (const e of entries) {
    if (e.fn !== 'food.note_change') continue
    const a = args(e)
    const note = String(a.p_note ?? '').trim()
    if (note) out.set(Number(a.p_activity), note)
    else out.delete(Number(a.p_activity))
  }
  return out
}

export async function fetchRecipes(): Promise<RecipeHeading[]> {
  const { data, error } = await food()
    .from('recipe')
    .select('item_id, category, cuisine, tags, protein, carbs, default_variation')
  if (error) throw error
  return data
}

export async function fetchVariations(): Promise<VariationFields[]> {
  const { data, error } = await food()
    .from('variation')
    .select('item_id, servings, prep_min, cook_min, sources, notes, archived_from')
  if (error) throw error
  return data
}

export async function fetchLines(): Promise<Line[]> {
  const { data, error } = await food()
    .from('variation_lines')
    .select('id, variation_id, position, heading, pantry_id, text, qty, qty_max, approx, unit')
    .order('position')
  if (error) throw error
  return data
}

export async function fetchSteps(): Promise<Step[]> {
  const { data, error } = await food()
    .from('variation_steps')
    .select('id, variation_id, position, text')
    .order('position')
  if (error) throw error
  return data
}

export async function fetchCooks(): Promise<Cook[]> {
  const { data, error } = await food()
    .from('cooks')
    .select(
      'id, variation_id, person_id, cooked_at, verdict, notes, servings, meal_id, snapshot, created_at',
    )
    .order('cooked_at')
  if (error) throw error
  return data
}

export async function fetchPantry(): Promise<PantryEntry[]> {
  const { data, error } = await food()
    .from('pantry')
    .select('id, name, kind, aisle, default_unit, added_by')
    .order('name')
  if (error) throw error
  return data
}

export async function fetchMeals(): Promise<MealRow[]> {
  const { data, error } = await food()
    .from('meal')
    .select('item_id, servings, leftovers_of, source')
  if (error) throw error
  return data
}

export async function fetchMealLines(): Promise<MealLine[]> {
  const { data, error } = await food()
    .from('meal_lines')
    .select('id, meal_id, position, pantry_id, text, qty, qty_max, approx, unit')
    .order('position')
  if (error) throw error
  return data
}

export async function fetchStaples(): Promise<Staple[]> {
  const { data, error } = await food().from('staples').select('space_id, pantry_id, out_of_stock')
  if (error) throw error
  return data
}

export async function fetchPersonalSpace(me: string): Promise<string | null> {
  const { data, error } = await supabase()
    .from('spaces')
    .select('id')
    .eq('kind', 'personal')
    .eq('created_by', me)
    .maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

export async function fetchValues(): Promise<FoodValue[]> {
  const { data, error } = await food()
    .from('values')
    .select('id, person_id, kind, name, created_at')
    .order('name')
  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// Unsent writes laid over what the server last sent (OFF-001).

type Args = Record<string, unknown>
const args = (e: QueueEntry) => e.args as Args
/** A name as the server keeps it: trimmed, its spaces single. */
const spaced = (v: unknown) =>
  String(v ?? '')
    .trim()
    .replace(/\s+/g, ' ')

export const blankHeading = (id: string): RecipeHeading => ({
  item_id: id,
  category: null,
  cuisine: null,
  tags: [],
  protein: [],
  carbs: [],
  default_variation: null,
})

export const blankVariation = (id: string): VariationFields => ({
  item_id: id,
  servings: null,
  prep_min: null,
  cook_min: null,
  sources: [],
  notes: null,
  archived_from: null,
})

const trimmed = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const names = (v: unknown) =>
  Array.isArray(v)
    ? v
        .map(String)
        .map((s) => s.trim())
        .filter(Boolean)
    : []

export function applyPendingRecipes(
  rows: readonly RecipeHeading[],
  entries: readonly QueueEntry[],
): RecipeHeading[] {
  const byId = new Map(rows.map((r) => [r.item_id, r]))
  for (const e of entries) {
    const a = args(e)
    if (e.fn === 'food.create_recipe') {
      const id = String(a.p_id)
      if (!byId.has(id))
        byId.set(id, { ...blankHeading(id), default_variation: String(a.p_variation) })
    } else if (e.fn === 'food.update_recipe') {
      const row = byId.get(String(a.p_id))
      const p = (a.p_patch ?? {}) as Args
      if (!row) continue
      byId.set(row.item_id, {
        ...row,
        ...('category' in p && { category: trimmed(p.category) }),
        ...('cuisine' in p && { cuisine: trimmed(p.cuisine) }),
        ...('tags' in p && { tags: names(p.tags) }),
        ...('protein' in p && { protein: names(p.protein) }),
        ...('carbs' in p && { carbs: names(p.carbs) }),
        ...('default_variation' in p && {
          default_variation: (p.default_variation as string) ?? null,
        }),
      })
    }
  }
  return [...byId.values()]
}

export function applyPendingVariations(
  rows: readonly VariationFields[],
  entries: readonly QueueEntry[],
): VariationFields[] {
  const byId = new Map(rows.map((r) => [r.item_id, r]))
  for (const e of entries) {
    const a = args(e)
    if (e.fn === 'food.create_recipe') {
      const id = String(a.p_variation)
      if (!byId.has(id)) byId.set(id, blankVariation(id))
    } else if (e.fn === 'food.add_variation') {
      const id = String(a.p_id)
      if (byId.has(id)) continue
      const from = a.p_from ? byId.get(String(a.p_from)) : undefined
      byId.set(id, from ? { ...from, item_id: id, archived_from: null } : blankVariation(id))
    } else if (e.fn === 'food.update_variation') {
      const row = byId.get(String(a.p_id))
      const p = (a.p_patch ?? {}) as Args
      if (!row) continue
      byId.set(row.item_id, {
        ...row,
        ...('servings' in p && { servings: (p.servings as number) ?? null }),
        ...('prep_min' in p && { prep_min: (p.prep_min as number) ?? null }),
        ...('cook_min' in p && { cook_min: (p.cook_min as number) ?? null }),
        ...('sources' in p && { sources: names(p.sources) }),
        ...('notes' in p && { notes: trimmed(p.notes) }),
      })
    }
  }
  return [...byId.values()]
}

const byPosition = <T extends { position: string; id: string }>(a: T, b: T) =>
  a.position < b.position ? -1 : a.position > b.position ? 1 : a.id < b.id ? -1 : 1

/** A copied row's id: the one the app chose and sent (RCP-016 1). */
const copiedId = (a: Args, id: string) =>
  ((a.p_ids ?? {}) as Record<string, string>)[id] ?? `${String(a.p_id)}:${id}`

/** Lines laid over, including those a new Variation copies from another. */
export function applyPendingLines(rows: readonly Line[], entries: readonly QueueEntry[]): Line[] {
  let out = [...rows]
  for (const e of entries) {
    const a = args(e)
    switch (e.fn) {
      case 'food.add_variation':
        if (a.p_from && !out.some((l) => l.variation_id === a.p_id))
          out = out.concat(
            out
              .filter((l) => l.variation_id === a.p_from)
              .map((l) => ({
                ...l,
                id: copiedId(a, l.id),
                variation_id: String(a.p_id),
              })),
          )
        break
      case 'food.add_line': {
        if (out.some((l) => l.id === a.p_id)) break
        const f = (a.p_fields ?? {}) as Args
        out.push({
          id: String(a.p_id),
          variation_id: String(a.p_variation),
          position: String(f.position ?? ''),
          heading: trimmed(f.heading),
          pantry_id: (f.pantry_id as string) ?? null,
          text: trimmed(f.text),
          qty: (f.qty as number) ?? null,
          qty_max: (f.qty_max as number) ?? null,
          approx: Boolean(f.approx),
          unit: (f.unit as string) ?? null,
        })
        break
      }
      case 'food.update_line': {
        const p = (a.p_patch ?? {}) as Args
        out = out.map((l) =>
          l.id !== a.p_id
            ? l
            : {
                ...l,
                ...('position' in p && { position: String(p.position) }),
                ...('heading' in p && { heading: trimmed(p.heading) }),
                ...('pantry_id' in p && { pantry_id: (p.pantry_id as string) ?? null }),
                ...('text' in p && { text: trimmed(p.text) }),
                ...('qty' in p && { qty: (p.qty as number) ?? null }),
                ...('qty_max' in p && { qty_max: (p.qty_max as number) ?? null }),
                ...('approx' in p && { approx: Boolean(p.approx) }),
                ...('unit' in p && { unit: (p.unit as string) ?? null }),
              },
        )
        break
      }
      case 'food.remove_line':
        out = out.filter((l) => l.id !== a.p_id)
        break
      case 'food.merge_pantry':
        out = out.map((l) =>
          l.pantry_id === a.p_merge ? { ...l, pantry_id: String(a.p_keep) } : l,
        )
        break
    }
  }
  return out.sort(byPosition)
}

export function applyPendingSteps(rows: readonly Step[], entries: readonly QueueEntry[]): Step[] {
  let out = [...rows]
  for (const e of entries) {
    const a = args(e)
    switch (e.fn) {
      case 'food.add_variation':
        if (a.p_from && !out.some((s) => s.variation_id === a.p_id))
          out = out.concat(
            out
              .filter((s) => s.variation_id === a.p_from)
              .map((s) => ({
                ...s,
                id: copiedId(a, s.id),
                variation_id: String(a.p_id),
              })),
          )
        break
      case 'food.add_step':
        if (!out.some((s) => s.id === a.p_id))
          out.push({
            id: String(a.p_id),
            variation_id: String(a.p_variation),
            position: String(a.p_position),
            text: String(a.p_text ?? ''),
          })
        break
      case 'food.update_step': {
        const p = (a.p_patch ?? {}) as Args
        out = out.map((s) =>
          s.id !== a.p_id
            ? s
            : {
                ...s,
                ...('text' in p && { text: String(p.text ?? '') }),
                ...('position' in p && { position: String(p.position) }),
              },
        )
        break
      }
      case 'food.remove_step':
        out = out.filter((s) => s.id !== a.p_id)
        break
    }
  }
  return out.sort(byPosition)
}

export function applyPendingCooks(
  rows: readonly Cook[],
  entries: readonly QueueEntry[],
  me: string,
): Cook[] {
  let out = [...rows]
  for (const e of entries) {
    const a = args(e)
    if (e.fn === 'food.log_cook') {
      if (out.some((c) => c.id === a.p_id)) continue
      const f = (a.p_fields ?? {}) as Args
      const at = new Date(e.createdAt).toISOString()
      out.push({
        id: String(a.p_id),
        variation_id: String(a.p_variation),
        person_id: me,
        cooked_at: (f.cooked_at as string) ?? at,
        verdict: (f.verdict as number) ?? null,
        notes: trimmed(f.notes),
        servings: (f.servings as number) ?? null,
        meal_id: (f.meal_id as string) ?? null,
        snapshot: {},
        created_at: at,
      })
    } else if (e.fn === 'food.update_cook') {
      const p = (a.p_patch ?? {}) as Args
      out = out.map((c) =>
        c.id !== a.p_id
          ? c
          : {
              ...c,
              ...('verdict' in p && { verdict: (p.verdict as number) ?? null }),
              ...('notes' in p && { notes: trimmed(p.notes) }),
              ...('servings' in p && { servings: (p.servings as number) ?? null }),
              ...('cooked_at' in p && { cooked_at: String(p.cooked_at) }),
            },
      )
    } else if (e.fn === 'food.remove_cook') {
      out = out.filter((c) => c.id !== a.p_id)
    }
  }
  return out.sort((x, y) => (x.cooked_at < y.cooked_at ? -1 : 1))
}

export function applyPendingValues(
  rows: readonly FoodValue[],
  entries: readonly QueueEntry[],
  me: string,
): FoodValue[] {
  let out = [...rows]
  for (const e of entries) {
    const a = args(e)
    if (e.fn === 'food.add_value') {
      const name = String(a.p_name ?? '').trim()
      if (out.some((v) => v.id === a.p_id)) continue
      out.push({
        id: String(a.p_id),
        person_id: me,
        kind: String(a.p_kind),
        name,
        created_at: new Date(e.createdAt).toISOString(),
      })
    } else if (e.fn === 'food.rename_value') {
      out = out.map((v) => (v.id === a.p_id ? { ...v, name: String(a.p_name ?? '').trim() } : v))
    } else if (e.fn === 'food.remove_value') {
      out = out.filter((v) => v.id !== a.p_id)
    }
  }
  return out
}

/** The Pantry with unsent entries, changes, merges and deletions laid over. */
export function applyPendingPantry(
  rows: readonly PantryEntry[],
  entries: readonly QueueEntry[],
  me: string,
): PantryEntry[] {
  let out = [...rows]
  for (const e of entries) {
    const a = args(e)
    if (e.fn === 'food.add_pantry') {
      if (out.some((p) => p.id === a.p_id)) continue
      const f = (a.p_fields ?? {}) as Args
      const kind = String(f.kind ?? 'ingredient')
      out.push({
        id: String(a.p_id),
        name: spaced(f.name),
        kind,
        aisle: kind === 'ingredient' ? String(f.aisle ?? 'cupboard') : null,
        default_unit: (f.default_unit as string) ?? null,
        added_by: me,
      })
    } else if (e.fn === 'food.update_pantry') {
      const f = (a.p_patch ?? {}) as Args
      out = out.map((p) => {
        if (p.id !== a.p_id) return p
        const kind = 'kind' in f ? String(f.kind) : p.kind
        return {
          ...p,
          ...('name' in f && { name: spaced(f.name) }),
          ...('default_unit' in f && { default_unit: (f.default_unit as string) ?? null }),
          kind,
          aisle:
            kind === 'household'
              ? null
              : 'aisle' in f
                ? String(f.aisle ?? 'cupboard')
                : (p.aisle ?? 'cupboard'),
        }
      })
    } else if (e.fn === 'food.remove_pantry') {
      out = out.filter((p) => p.id !== a.p_id)
    } else if (e.fn === 'food.merge_pantry') {
      out = out.filter((p) => p.id !== a.p_merge)
    }
  }
  return out
}

/** Meals' servings and leftovers, with unsent Meals and changes laid over (MPL-002, MPL-003). */
export function applyPendingMeals(
  rows: readonly MealRow[],
  entries: readonly QueueEntry[],
): MealRow[] {
  const byId = new Map(rows.map((r) => [r.item_id, r]))
  for (const e of entries) {
    const a = args(e)
    if (e.fn === 'food.plan_meal') {
      const id = String(a.p_id)
      const f = (a.p_fields ?? {}) as Args
      if (!byId.has(id))
        byId.set(id, {
          item_id: id,
          servings: (f.servings as number) ?? null,
          leftovers_of: (f.leftovers_of as string) ?? null,
          source: trimmed(f.source),
        })
    } else if (e.fn === 'food.update_meal') {
      const row = byId.get(String(a.p_id))
      const p = (a.p_patch ?? {}) as Args
      if (!row) continue
      byId.set(row.item_id, {
        ...row,
        ...('servings' in p && { servings: (p.servings as number) ?? null }),
        ...('leftovers_of' in p && { leftovers_of: (p.leftovers_of as string) ?? null }),
        ...('source' in p && { source: trimmed(p.source) }),
      })
    }
  }
  return [...byId.values()]
}

/** Meals' own lines, with unsent changes and merges laid over (MPL-006). */
export function applyPendingMealLines(
  rows: readonly MealLine[],
  entries: readonly QueueEntry[],
): MealLine[] {
  let out = [...rows]
  for (const e of entries) {
    const a = args(e)
    switch (e.fn) {
      case 'food.add_meal_line': {
        if (out.some((l) => l.id === a.p_id)) break
        const f = (a.p_fields ?? {}) as Args
        out.push({
          id: String(a.p_id),
          meal_id: String(a.p_meal),
          position: String(f.position ?? ''),
          pantry_id: (f.pantry_id as string) ?? null,
          text: trimmed(f.text),
          qty: (f.qty as number) ?? null,
          qty_max: (f.qty_max as number) ?? null,
          approx: Boolean(f.approx),
          unit: (f.unit as string) ?? null,
        })
        break
      }
      case 'food.update_meal_line': {
        const p = (a.p_patch ?? {}) as Args
        out = out.map((l) =>
          l.id !== a.p_id
            ? l
            : {
                ...l,
                ...('position' in p && { position: String(p.position) }),
                ...('pantry_id' in p && { pantry_id: (p.pantry_id as string) ?? null }),
                ...('text' in p && { text: trimmed(p.text) }),
                ...('qty' in p && { qty: (p.qty as number) ?? null }),
                ...('qty_max' in p && { qty_max: (p.qty_max as number) ?? null }),
                ...('approx' in p && { approx: Boolean(p.approx) }),
                ...('unit' in p && { unit: (p.unit as string) ?? null }),
              },
        )
        break
      }
      case 'food.remove_meal_line':
        out = out.filter((l) => l.id !== a.p_id)
        break
      case 'food.merge_pantry':
        out = out.map((l) =>
          l.pantry_id === a.p_merge ? { ...l, pantry_id: String(a.p_keep) } : l,
        )
        break
    }
  }
  return out.sort(byPosition)
}

/** My staples, with unsent marks, merges and deletions laid over (PAN-002). */
export function applyPendingStaples(
  rows: readonly Staple[],
  entries: readonly QueueEntry[],
): Staple[] {
  let out = [...rows]
  for (const e of entries) {
    const a = args(e)
    if (e.fn === 'food.set_staple') {
      const same = (s: Staple) => s.space_id === a.p_space && s.pantry_id === a.p_pantry
      out = out.filter((s) => !same(s))
      if (a.p_staple)
        out.push({
          space_id: String(a.p_space),
          pantry_id: String(a.p_pantry),
          out_of_stock: Boolean(a.p_out_of_stock),
        })
    } else if (e.fn === 'food.remove_pantry') {
      out = out.filter((s) => s.pantry_id !== a.p_id)
    } else if (e.fn === 'food.merge_pantry') {
      const moved = out.filter((s) => s.pantry_id === a.p_merge)
      out = out.filter((s) => s.pantry_id !== a.p_merge)
      for (const m of moved) {
        const kept = (s: Staple) => s.space_id === m.space_id && s.pantry_id === a.p_keep
        out = out.some(kept)
          ? out.map((s) => (kept(s) ? { ...s, out_of_stock: s.out_of_stock || m.out_of_stock } : s))
          : [...out, { ...m, pantry_id: String(a.p_keep) }]
      }
    }
  }
  return out
}
