import { newId } from './ids'
import type { WriteQueue } from './queue/queue'
import type { WardrobeList } from './wardrobe'

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
    /** Retired, or brought back (WRD-013). */
    retireGarment(id: string, retired = true): void {
      queue.enqueue('wardrobe.retire_garment', { p_id: id, p_retired: retired }, [id])
    },
  }
}
