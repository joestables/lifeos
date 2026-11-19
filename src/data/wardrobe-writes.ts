import { newId } from './ids'
import type { WriteQueue } from './queue/queue'
import type { WardrobeList } from './wardrobe'

/** What a new garment is made of (WRD-005 3): entries by id. */
export interface GarmentFields {
  category: string
  size: string
  brand: string
  colour: string
  fit?: string | null
  tags?: string[]
  ownName?: string | null
}

/** What a garment's fields change by (WRD-010 2), as `wardrobe.update_garment` takes them. */
export type GarmentPatch = {
  category_id?: string
  size_id?: string
  brand_id?: string
  colour_id?: string
  fit_id?: string | null
  own_name?: string | null
}

/**
 * The Wardrobe's writes (ADR-0042, ADR-0066): each queues one function of
 * the `wardrobe` schema and returns at once; ids are made here, so a write
 * sent twice is applied once.
 */
export function wardrobeWrites(queue: WriteQueue) {
  return {
    /**
     * An entry of a list, new or renamed (WRD-028): a colour's swatch as hex;
     * a new entry of an ordered list at the place given (else last).
     */
    saveEntry(
      list: WardrobeList,
      name: string,
      { id = newId(), hex, position }: { id?: string; hex?: string; position?: string } = {},
    ): string {
      queue.enqueue(
        'wardrobe.save_entry',
        {
          p_list: list,
          p_id: id,
          p_name: name.trim(),
          ...(hex && { p_hex: hex.toLowerCase() }),
          ...(position && { p_position: position }),
        },
        [],
      )
      return id
    },
    /** Dragged into its place (WRD-028 2). */
    setEntryPosition(list: WardrobeList, id: string, position: string): void {
      queue.enqueue(
        'wardrobe.set_entry_position',
        { p_list: list, p_id: id, p_position: position },
        [],
      )
    },
    /** Refused by the server while a garment uses it (WRD-028 5). */
    removeEntry(list: WardrobeList, id: string): void {
      queue.enqueue('wardrobe.remove_entry', { p_list: list, p_id: id }, [])
    },
    /** Whatever used `from` uses `into`, and `from` goes (WRD-028 3–5). */
    mergeEntry(list: WardrobeList, from: string, into: string): void {
      queue.enqueue('wardrobe.merge_entry', { p_list: list, p_from: from, p_into: into }, [])
    },
    /** The weather's place (WRD-028 6; ADR-0068 4). */
    setWeatherPlace(name: string, latitude: number, longitude: number): void {
      queue.enqueue(
        'wardrobe.set_weather_place',
        { p_name: name.trim(), p_latitude: latitude, p_longitude: longitude },
        [],
      )
    },
    /**
     * A new garment (WRD-005): its four required entries, an optional fit,
     * tags and own name. Its title is worked out by the server.
     */
    createGarment(fields: GarmentFields, id: string = newId()): string {
      queue.enqueue(
        'wardrobe.create_garment',
        {
          p_id: id,
          p_category: fields.category,
          p_size: fields.size,
          p_brand: fields.brand,
          p_colour: fields.colour,
          ...(fields.fit && { p_fit: fields.fit }),
          p_tags: fields.tags ?? [],
          ...(fields.ownName?.trim() && { p_own_name: fields.ownName.trim() }),
        },
        [id],
      )
      return id
    },
    /** Its fields changed (WRD-010 2): only those given; a fit or own name cleared with null. */
    updateGarment(id: string, patch: GarmentPatch): void {
      queue.enqueue('wardrobe.update_garment', { p_id: id, p_patch: { ...patch } }, [id])
    },
    /** Tags added to several garments at once (WRD-012 2). */
    addGarmentTags(garments: string[], tags: string[]): void {
      if (!garments.length || !tags.length) return
      queue.enqueue('wardrobe.add_garment_tags', { p_garments: garments, p_tags: tags }, garments)
    },
    /** Tags taken off several garments at once (WRD-012 2). */
    removeGarmentTags(garments: string[], tags: string[]): void {
      if (!garments.length || !tags.length) return
      queue.enqueue(
        'wardrobe.remove_garment_tags',
        { p_garments: garments, p_tags: tags },
        garments,
      )
    },
    /**
     * A new outfit (WRD-014 4): its garments, an optional name and my
     * collections (My Outfits isn't stored). The same garments as another
     * outfit are refused by the server: check `sameOutfit` first.
     */
    createOutfit(
      garments: string[],
      { name, collections = [] }: { name?: string; collections?: string[] } = {},
      id: string = newId(),
    ): string {
      queue.enqueue(
        'wardrobe.create_outfit',
        {
          p_id: id,
          p_garments: [...new Set(garments)],
          ...(name?.trim() && { p_name: name.trim() }),
          p_collections: collections,
        },
        [id],
      )
      return id
    },
    renameOutfit(id: string, name: string): void {
      queue.enqueue('wardrobe.rename_outfit', { p_id: id, p_name: name.trim() }, [id])
    },
    /** A garment in or out of an outfit (WRD-017 2): one stays at least. */
    addOutfitGarment(outfit: string, garment: string): void {
      queue.enqueue('wardrobe.add_outfit_garment', { p_outfit: outfit, p_garment: garment }, [
        outfit,
      ])
    },
    removeOutfitGarment(outfit: string, garment: string): void {
      queue.enqueue('wardrobe.remove_outfit_garment', { p_outfit: outfit, p_garment: garment }, [
        outfit,
      ])
    },
    /** Outfits into my collections, several at once (WRD-018 2, WRD-019 2). */
    addToCollections(outfits: string[], collections: string[]): void {
      if (!outfits.length || !collections.length) return
      queue.enqueue(
        'wardrobe.add_to_collections',
        { p_outfits: outfits, p_collections: collections },
        outfits,
      )
    },
    /** Out of one of my collections; never out of My Outfits (WRD-019 3). */
    removeFromCollection(outfits: string[], collection: string): void {
      queue.enqueue(
        'wardrobe.remove_from_collection',
        { p_outfits: outfits, p_collection: collection },
        outfits,
      )
    },
    /** Into the Planned Outfits pane, newest last (WRD-021 1). */
    addPlanned(outfits: string[]): void {
      if (outfits.length) queue.enqueue('wardrobe.add_planned', { p_outfits: outfits }, outfits)
    },
    removePlanned(outfits: string[]): void {
      if (outfits.length) queue.enqueue('wardrobe.remove_planned', { p_outfits: outfits }, outfits)
    },
    clearPlanned(): void {
      queue.enqueue('wardrobe.clear_planned', {}, [])
    },
    /** Retired, or brought back (WRD-013). */
    retireGarment(id: string, retired = true): void {
      queue.enqueue('wardrobe.retire_garment', { p_id: id, p_retired: retired }, [id])
    },
  }
}
