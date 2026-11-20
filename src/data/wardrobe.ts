import type { Database } from './database.types'
import type { QueueEntry } from './queue/store'
import { supabase } from './supabase'
import { allRows } from './paging'

type Wardrobe = Database['wardrobe']['Tables']

/**
 * The Wardrobe's lists (WRD-028; ADR-0066 5), each mine and empty to begin
 * with. Categories, Sizes and Collections are in my order; the rest A–Z.
 */
export type WardrobeList = 'category' | 'size' | 'brand' | 'fit' | 'tag' | 'colour' | 'collection'

export const WARDROBE_LISTS: readonly WardrobeList[] = [
  'category',
  'size',
  'collection',
  'colour',
  'fit',
  'brand',
  'tag',
]

/** The lists in my order, dragged by their handles (WRD-028 2). */
export const ORDERED_LISTS: readonly WardrobeList[] = ['category', 'size', 'collection']

const TABLES: Record<WardrobeList, keyof Wardrobe> = {
  category: 'categories',
  size: 'sizes',
  brand: 'brands',
  fit: 'fits',
  tag: 'tags',
  colour: 'colours',
  collection: 'collections',
}

/** An entry of a list: its place where the list is ordered, its swatch where it's a colour. */
export interface WardrobeEntry {
  id: string
  name: string
  position: string | null
  hex: string | null
}

export type WardrobeLists = Record<WardrobeList, WardrobeEntry[]>

/** A Garment's own fields beyond its Item (ADR-0066 4). */
export type GarmentRow = Omit<Wardrobe['garment']['Row'], 'updated_at'>
export type GarmentTag = Pick<Wardrobe['garment_tags']['Row'], 'garment_id' | 'tag_id'>
export type OutfitCollection = Pick<
  Wardrobe['outfit_collections']['Row'],
  'outfit_id' | 'collection_id'
>

/** The weather's place (ADR-0068 4), or none yet. */
export interface WeatherPlace {
  name: string
  latitude: number
  longitude: number
}

export const wardrobeListsKey = ['wardrobe', 'lists'] as const
export const garmentsKey = ['wardrobe', 'garment'] as const
export const garmentTagsKey = ['wardrobe', 'garment_tags'] as const
export const outfitCollectionsKey = ['wardrobe', 'outfit_collections'] as const
export const wardrobeSettingsKey = ['wardrobe', 'settings'] as const
export const plannedKey = ['wardrobe', 'planned_outfits'] as const
export const wornGarmentsKey = ['wardrobe', 'worn_garments'] as const

/** A garment on a day (ADR-0066 7): the day's own snapshot, by Outfit worn. */
export type WornGarment = Pick<Wardrobe['worn_garments']['Row'], 'worn_id' | 'garment_id'>

/** An outfit waiting in the Planned Outfits pane (WRD-021), in the pane's order. */
export interface Planned {
  outfit_id: string
  position: string
}

const wardrobe = () => supabase().schema('wardrobe')

const emptyLists = (): WardrobeLists => ({
  category: [],
  size: [],
  brand: [],
  fit: [],
  tag: [],
  colour: [],
  collection: [],
})

/** Ordered lists by their place, the rest A–Z. */
export function sortEntries(list: WardrobeList, rows: WardrobeEntry[]): WardrobeEntry[] {
  return ORDERED_LISTS.includes(list)
    ? rows.sort((a, b) =>
        (a.position ?? '') < (b.position ?? '')
          ? -1
          : (a.position ?? '') > (b.position ?? '')
            ? 1
            : a.id.localeCompare(b.id),
      )
    : rows.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
}

export async function fetchWardrobeLists(): Promise<WardrobeLists> {
  const lists = emptyLists()
  await Promise.all(
    WARDROBE_LISTS.map(async (list) => {
      const rows = await allRows<Record<string, unknown>>(
        (from, to) =>
          wardrobe().from(TABLES[list]).select('*').order('id').range(from, to) as never,
      )
      lists[list] = sortEntries(
        list,
        rows.map((r) => ({
          id: String(r.id),
          name: String(r.name),
          position: typeof r.position === 'string' ? r.position : null,
          hex: typeof r.hex === 'string' ? r.hex : null,
        })),
      )
    }),
  )
  return lists
}

export async function fetchGarments(): Promise<GarmentRow[]> {
  return allRows((from, to) =>
    wardrobe()
      .from('garment')
      .select('item_id, category_id, size_id, brand_id, colour_id, fit_id, own_name')
      .order('item_id')
      .range(from, to),
  )
}

export async function fetchGarmentTags(): Promise<GarmentTag[]> {
  return allRows((from, to) =>
    wardrobe()
      .from('garment_tags')
      .select('garment_id, tag_id')
      .order('garment_id')
      .order('tag_id')
      .range(from, to),
  )
}

export async function fetchOutfitCollections(): Promise<OutfitCollection[]> {
  return allRows((from, to) =>
    wardrobe()
      .from('outfit_collections')
      .select('outfit_id, collection_id')
      .order('outfit_id')
      .order('collection_id')
      .range(from, to),
  )
}

/** The Planned Outfits pane, newest last; one taken out is marked, and left out here. */
export async function fetchPlanned(): Promise<Planned[]> {
  return allRows((from, to) =>
    wardrobe()
      .from('planned_outfits')
      .select('outfit_id, position')
      .is('removed_at', null)
      .order('position')
      .order('outfit_id')
      .range(from, to),
  )
}

export async function fetchWornGarments(): Promise<WornGarment[]> {
  return allRows((from, to) =>
    wardrobe()
      .from('worn_garments')
      .select('worn_id, garment_id')
      .order('worn_id')
      .order('garment_id')
      .range(from, to),
  )
}

export async function fetchWeatherPlace(): Promise<WeatherPlace | null> {
  const { data, error } = await wardrobe()
    .from('settings')
    .select('place_name, latitude, longitude')
    .limit(1)
  if (error) throw error
  const s = data[0]
  if (!s?.place_name || s.latitude === null || s.longitude === null) return null
  return { name: s.place_name, latitude: Number(s.latitude), longitude: Number(s.longitude) }
}

// ---------------------------------------------------------------------------
// Unsent writes laid over what the server last sent (OFF-001).

type Args = Record<string, unknown>
const args = (e: QueueEntry) => e.args as Args

export function applyPendingLists(lists: WardrobeLists, entries: readonly QueueEntry[]) {
  if (entries.length === 0) return lists
  const out = emptyLists()
  for (const list of WARDROBE_LISTS) out[list] = lists[list].map((e) => ({ ...e }))
  const touched = new Set<WardrobeList>()
  for (const e of entries) {
    const a = args(e)
    const list = a.p_list as WardrobeList
    if (!(list in out)) continue
    const rows = out[list]
    if (e.fn === 'wardrobe.save_entry') {
      const id = String(a.p_id)
      const old = rows.find((r) => r.id === id)
      const name = String(a.p_name).trim()
      const hex = typeof a.p_hex === 'string' ? a.p_hex.toLowerCase() : null
      const position = typeof a.p_position === 'string' ? a.p_position : null
      if (old) {
        old.name = name
        if (hex) old.hex = hex
        if (position) old.position = position
      } else rows.push({ id, name, hex, position })
    } else if (e.fn === 'wardrobe.set_entry_position') {
      const row = rows.find((r) => r.id === a.p_id)
      if (row) row.position = String(a.p_position)
    } else if (e.fn === 'wardrobe.remove_entry' && e.state === 'pending') {
      out[list] = rows.filter((r) => r.id !== a.p_id)
    } else if (e.fn === 'wardrobe.merge_entry' && e.state === 'pending') {
      out[list] = rows.filter((r) => r.id !== a.p_from)
    } else continue
    touched.add(list)
  }
  for (const list of touched) sortEntries(list, out[list])
  return out
}

const GARMENT_FIELD: Partial<Record<WardrobeList, keyof GarmentRow>> = {
  category: 'category_id',
  size: 'size_id',
  brand: 'brand_id',
  colour: 'colour_id',
  fit: 'fit_id',
}

/**
 * Garments' own fields: made (WRD-005), changed (WRD-010 2), and moved to
 * the entry kept by a merge (WRD-028 4–5).
 */
export function applyPendingGarments(rows: readonly GarmentRow[], entries: readonly QueueEntry[]) {
  let out = rows as GarmentRow[]
  for (const e of entries) {
    const a = args(e)
    if (e.fn === 'wardrobe.create_garment') {
      if (out.some((g) => g.item_id === a.p_id)) continue
      out = [
        ...out,
        {
          item_id: String(a.p_id),
          category_id: String(a.p_category),
          size_id: String(a.p_size),
          brand_id: String(a.p_brand),
          colour_id: String(a.p_colour),
          fit_id: typeof a.p_fit === 'string' ? a.p_fit : null,
          own_name: typeof a.p_own_name === 'string' ? a.p_own_name.trim() || null : null,
        },
      ]
    } else if (e.fn === 'wardrobe.update_garment') {
      const patch = (a.p_patch ?? {}) as Partial<GarmentRow>
      out = out.map((g) =>
        g.item_id === a.p_id
          ? {
              ...g,
              ...Object.fromEntries(
                Object.entries(patch).filter(
                  ([k, v]) => v !== null || k === 'fit_id' || k === 'own_name',
                ),
              ),
            }
          : g,
      )
    } else if (e.fn === 'wardrobe.merge_entry') {
      const field = GARMENT_FIELD[a.p_list as WardrobeList]
      if (!field) continue
      out = out.map((g) => (g[field] === a.p_from ? { ...g, [field]: String(a.p_into) } : g))
    }
  }
  return out
}

export function applyPendingGarmentTags(
  rows: readonly GarmentTag[],
  entries: readonly QueueEntry[],
) {
  let out = rows as GarmentTag[]
  const add = (garments: unknown, tags: unknown) => {
    for (const g of (garments as string[] | undefined) ?? [])
      for (const t of (tags as string[] | undefined) ?? [])
        if (!out.some((o) => o.garment_id === g && o.tag_id === t))
          out = [...out, { garment_id: g, tag_id: t }]
  }
  for (const e of entries) {
    const a = args(e)
    if (e.fn === 'wardrobe.create_garment') add([a.p_id], a.p_tags)
    else if (e.fn === 'wardrobe.add_garment_tags') add(a.p_garments, a.p_tags)
    else if (e.fn === 'wardrobe.remove_garment_tags') {
      const gs = (a.p_garments as string[]) ?? []
      const ts = (a.p_tags as string[]) ?? []
      out = out.filter((o) => !(gs.includes(o.garment_id) && ts.includes(o.tag_id)))
    } else if (e.fn === 'wardrobe.merge_entry' && a.p_list === 'tag') {
      const moved = out.filter((t) => t.tag_id === a.p_from)
      out = out.filter((t) => t.tag_id !== a.p_from)
      for (const t of moved)
        if (!out.some((o) => o.garment_id === t.garment_id && o.tag_id === a.p_into))
          out = [...out, { garment_id: t.garment_id, tag_id: String(a.p_into) }]
    }
  }
  return out
}

export function applyPendingOutfitCollections(
  rows: readonly OutfitCollection[],
  entries: readonly QueueEntry[],
) {
  let out = rows as OutfitCollection[]
  const add = (outfits: unknown, collections: unknown) => {
    for (const o of (outfits as string[] | undefined) ?? [])
      for (const c of (collections as string[] | undefined) ?? [])
        if (!out.some((x) => x.outfit_id === o && x.collection_id === c))
          out = [...out, { outfit_id: o, collection_id: c }]
  }
  for (const e of entries) {
    const a = args(e)
    if (e.fn === 'wardrobe.create_outfit') {
      add([a.p_id], a.p_collections)
      continue
    }
    if (e.fn === 'wardrobe.add_to_collections') {
      add(a.p_outfits, a.p_collections)
      continue
    }
    if (e.fn === 'wardrobe.remove_from_collection') {
      const os = (a.p_outfits as string[]) ?? []
      out = out.filter((x) => !(x.collection_id === a.p_collection && os.includes(x.outfit_id)))
      continue
    }
    if (a.p_list !== 'collection') continue
    if (e.fn === 'wardrobe.remove_entry') {
      out = out.filter((c) => c.collection_id !== a.p_id)
    } else if (e.fn === 'wardrobe.merge_entry') {
      const moved = out.filter((c) => c.collection_id === a.p_from)
      out = out.filter((c) => c.collection_id !== a.p_from)
      for (const c of moved)
        if (!out.some((o) => o.outfit_id === c.outfit_id && o.collection_id === a.p_into))
          out.push({ outfit_id: c.outfit_id, collection_id: String(a.p_into) })
    }
  }
  return out
}

export function applyPendingWeatherPlace(
  place: WeatherPlace | null,
  entries: readonly QueueEntry[],
): WeatherPlace | null {
  let out = place
  for (const e of entries) {
    if (e.fn !== 'wardrobe.set_weather_place') continue
    const a = args(e)
    out =
      typeof a.p_name === 'string' && a.p_name.trim()
        ? {
            name: a.p_name.trim(),
            latitude: Number(a.p_latitude),
            longitude: Number(a.p_longitude),
          }
        : null
  }
  return out
}

/** The pane with unsent adds, removes and clears laid over (WRD-021 1): an outfit added again goes last. */
export function applyPendingPlanned(rows: readonly Planned[], entries: readonly QueueEntry[]) {
  let out = rows as Planned[]
  for (const e of entries) {
    const a = args(e)
    if (e.fn === 'wardrobe.add_planned') {
      const os = (a.p_outfits as string[]) ?? []
      // After anything the server ordered: its positions are its clock's, so this sorts last.
      const at = `~${String(e.createdAt).padStart(15, '0')}${e.id}`
      out = [
        ...out.filter((p) => !os.includes(p.outfit_id)),
        ...os.map((o, i) => ({ outfit_id: o, position: `${at}${String(i).padStart(4, '0')}` })),
      ]
    } else if (e.fn === 'wardrobe.remove_planned') {
      const os = (a.p_outfits as string[]) ?? []
      out = out.filter((p) => !os.includes(p.outfit_id))
    } else if (e.fn === 'wardrobe.clear_planned') out = []
    // Placed on a day, it leaves the pane (WRD-021 3).
    else if (e.fn === 'wardrobe.plan_outfit') out = out.filter((p) => p.outfit_id !== a.p_outfit)
  }
  return out === rows ? out : [...out].sort((x, y) => (x.position < y.position ? -1 : 1))
}

/**
 * Days' garments with unsent writes laid over (WRD-021–WRD-023): an outfit
 * placed takes its garments as they are now (`garmentsOf`); a garment
 * taken off a day leaves that day only; an outfit made from a day's single
 * garments wears all of them.
 */
export function applyPendingWornGarments(
  rows: readonly WornGarment[],
  entries: readonly QueueEntry[],
  garmentsOf: (outfit: string) => readonly string[],
): WornGarment[] {
  let out = rows as WornGarment[]
  const add = (worn: string, garments: readonly string[]) => {
    for (const g of garments)
      if (!out.some((r) => r.worn_id === worn && r.garment_id === g))
        out = [...out, { worn_id: worn, garment_id: g }]
  }
  for (const e of entries) {
    const a = args(e)
    if (e.fn === 'wardrobe.plan_outfit') {
      if (!out.some((r) => r.worn_id === a.p_id))
        add(String(a.p_id), garmentsOf(String(a.p_outfit)))
    } else if (e.fn === 'wardrobe.plan_garment') add(String(a.p_id), [String(a.p_garment)])
    else if (e.fn === 'wardrobe.remove_day_garment')
      out = out.filter((r) => !(r.worn_id === a.p_worn && r.garment_id === a.p_garment))
    else if (e.fn === 'wardrobe.create_outfit_from_day') {
      const singles = (a.p_singles as string[]) ?? []
      add(
        String(a.p_worn),
        out.filter((r) => singles.includes(r.worn_id)).map((r) => r.garment_id),
      )
    }
  }
  return out
}
