import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useAllItems, useMarks, useQueueEntries } from './hooks'
import { applyPendingPhotos, fetchPhotos, photosKey, useHeldPhotos, type Photo } from './photos'
import type { WriteQueue } from './queue/queue'
import type { Item } from './types'
import {
  applyPendingGarments,
  applyPendingGarmentTags,
  applyPendingLists,
  applyPendingOutfitCollections,
  applyPendingWeatherPlace,
  fetchGarments,
  fetchGarmentTags,
  fetchOutfitCollections,
  fetchWardrobeLists,
  fetchWeatherPlace,
  garmentsKey,
  garmentTagsKey,
  outfitCollectionsKey,
  wardrobeListsKey,
  wardrobeSettingsKey,
  type GarmentRow,
  type WardrobeEntry,
  type WardrobeList,
  type WardrobeLists,
  type WeatherPlace,
} from './wardrobe'

/** A garment as the app shows it: its Item, its own fields and their entries. */
export interface GarmentView {
  item: Item
  row: GarmentRow
  category?: WardrobeEntry
  size?: WardrobeEntry
  brand?: WardrobeEntry
  colour?: WardrobeEntry
  fit?: WardrobeEntry
  tags: WardrobeEntry[]
  photo: Photo | undefined
  retired: boolean
  favourite: boolean
  /** Not on the server yet, its photo included, or refused (WRD-005 6). */
  sync?: 'pending' | 'failed'
  /** Its title: the server's, or worked out while it is on its way (ADR-0066 3). */
  title: string
}

/** How many use an entry: what shows (garments not deleted, or outfits) and all. */
export interface EntryUses {
  shown: number
  /** With garments in Recently deleted, which keep it in use (WRD-028 5). */
  all: number
}

export interface WardrobeData {
  lists: WardrobeLists
  /** My garments, Owned and Retired, not deleted. */
  garments: GarmentView[]
  /** My outfits, not deleted: My Outfits (ADR-0066 6). */
  outfits: Item[]
  place: WeatherPlace | null
  uses: (list: WardrobeList, id: string) => EntryUses
  isLoading: boolean
}

const EMPTY: WardrobeLists = {
  category: [],
  size: [],
  brand: [],
  fit: [],
  tag: [],
  colour: [],
  collection: [],
}

/**
 * The Wardrobe (ADR-0066): my lists, garments and outfits, with writes not
 * yet sent laid over them (OFF-001).
 */
export function useWardrobe(queue: WriteQueue): WardrobeData {
  const entries = useQueueEntries(queue)
  const { all, isLoading: itemsLoading } = useAllItems(queue)
  const lists = useQuery({ queryKey: wardrobeListsKey, queryFn: fetchWardrobeLists })
  const rows = useQuery({ queryKey: garmentsKey, queryFn: fetchGarments })
  const tagRows = useQuery({ queryKey: garmentTagsKey, queryFn: fetchGarmentTags })
  const inCollections = useQuery({
    queryKey: outfitCollectionsKey,
    queryFn: fetchOutfitCollections,
  })
  const settings = useQuery({ queryKey: wardrobeSettingsKey, queryFn: fetchWeatherPlace })
  const photos = useQuery({ queryKey: photosKey, queryFn: fetchPhotos })
  const held = useHeldPhotos()
  const marks = useMarks(queue)

  return useMemo(() => {
    const mine = entries.filter((e) => e.fn.startsWith('wardrobe.'))
    const listed = applyPendingLists(lists.data ?? EMPTY, mine)
    const byId = (list: WardrobeList) => new Map(listed[list].map((e) => [e.id, e]))
    const at = {
      category: byId('category'),
      size: byId('size'),
      brand: byId('brand'),
      colour: byId('colour'),
      fit: byId('fit'),
      tag: byId('tag'),
    }
    const detail = applyPendingGarments(rows.data ?? [], mine)
    const tags = applyPendingGarmentTags(tagRows.data ?? [], mine)
    const collected = applyPendingOutfitCollections(inCollections.data ?? [], mine)
    const photoOf = new Map(
      [...applyPendingPhotos(photos.data ?? [], entries), ...held].map((p) => [p.item_id, p]),
    )
    const itemOf = new Map(all.map((i) => [i.id, i]))
    const deleted = new Set(all.filter((i) => i.archived_at !== null).map((i) => i.id))

    const heldFor = new Set(held.map((p) => p.item_id))
    const mineTags = new Map<string, Set<string>>()
    for (const t of tags) {
      const set = mineTags.get(t.garment_id) ?? new Set<string>()
      set.add(t.tag_id)
      mineTags.set(t.garment_id, set)
    }
    const garments: GarmentView[] = []
    for (const row of detail) {
      const item = itemOf.get(row.item_id)
      if (!item || item.archived_at !== null) continue
      garments.push({
        item,
        row,
        category: at.category.get(row.category_id),
        size: at.size.get(row.size_id),
        brand: at.brand.get(row.brand_id),
        colour: at.colour.get(row.colour_id),
        fit: row.fit_id ? at.fit.get(row.fit_id) : undefined,
        tags: listed.tag.filter((t) => mineTags.get(row.item_id)?.has(t.id)),
        photo: photoOf.get(row.item_id),
        retired: item.status === 'cancelled',
        favourite: marks.has(row.item_id),
        sync: item.sync ?? (heldFor.has(row.item_id) ? 'pending' : undefined),
        title:
          item.title ||
          row.own_name ||
          [
            at.colour.get(row.colour_id)?.name,
            at.brand.get(row.brand_id)?.name,
            at.category.get(row.category_id)?.name,
          ]
            .filter(Boolean)
            .join(' '),
      })
    }
    garments.sort((a, b) => a.title.localeCompare(b.title))
    const outfits = all.filter((i) => i.type === 'outfit' && i.archived_at === null)
    const liveOutfits = new Set(outfits.map((o) => o.id))

    const FIELD = {
      category: 'category_id',
      size: 'size_id',
      brand: 'brand_id',
      colour: 'colour_id',
      fit: 'fit_id',
    } as const
    const uses = (list: WardrobeList, id: string): EntryUses => {
      if (list === 'collection') {
        const n = collected.filter((c) => c.collection_id === id && liveOutfits.has(c.outfit_id))
        return { shown: n.length, all: n.length }
      }
      const users =
        list === 'tag'
          ? tags.filter((t) => t.tag_id === id).map((t) => t.garment_id)
          : detail.filter((g) => g[FIELD[list]] === id).map((g) => g.item_id)
      return { shown: users.filter((g) => !deleted.has(g)).length, all: users.length }
    }

    return {
      lists: listed,
      garments,
      outfits,
      place: applyPendingWeatherPlace(settings.data ?? null, mine),
      uses,
      isLoading: itemsLoading || lists.isLoading || rows.isLoading,
    }
  }, [
    entries,
    all,
    itemsLoading,
    lists.data,
    lists.isLoading,
    rows.data,
    rows.isLoading,
    tagRows.data,
    inCollections.data,
    settings.data,
    photos.data,
    held,
    marks,
  ])
}
