import { toast } from '@/components/ui/sonner'
import {
  addOutfitGarment,
  addPlanned,
  addToCollections,
  archiveItem,
  createOutfit,
  removeFromCollection,
  removeOutfitGarment,
  removePlanned,
  renameOutfit,
  restoreItem,
  type GarmentView,
  type OutfitView,
  type WardrobeData,
} from '@/data'

/** What an outfit is called on a card or in a toast: its name, or "Untitled outfit". */
export const outfitName = (o: Pick<OutfitView, 'name'>) => o.name.trim() || 'Untitled outfit'

/** "3 garments". */
export const garmentCount = (n: number) => `${n} garment${n === 1 ? '' : 's'}`

/**
 * An outfit saved (WRD-014 4–5): made in My Outfits and the collections
 * chosen, with Open and Undo; the same garments as another outfit make
 * nothing, saying so with Open. Returns the new outfit's id, or none.
 */
export function saveOutfit(
  wardrobe: WardrobeData,
  garments: readonly string[],
  fields: { name?: string; collections?: string[] },
  open: (id: string) => void,
): string | undefined {
  const same = wardrobe.sameOutfit(garments)
  if (same) {
    toast(`Already an outfit: ${outfitName(same)}`, {
      action: { label: 'Open', onClick: () => open(same.item.id) },
    })
    return undefined
  }
  const id = createOutfit([...garments], fields)
  // One action a toast: Open; a mistake is deleted from its popup, with Undo.
  toast('Outfit saved', { action: { label: 'Open', onClick: () => open(id) } })
  return id
}

/**
 * An outfit changed (WRD-017 2): its garments in and out, its name, its
 * collections. Garments that are exactly another outfit are refused,
 * saying which. Returns whether it was changed.
 */
export function changeOutfit(
  wardrobe: WardrobeData,
  outfit: OutfitView,
  next: { garments: readonly string[]; name: string; collections: readonly string[] },
  open: (id: string) => void,
): boolean {
  const same = wardrobe.sameOutfit(next.garments, outfit.item.id)
  if (same) {
    toast(`Already an outfit: ${outfitName(same)}`, {
      action: { label: 'Open', onClick: () => open(same.item.id) },
    })
    return false
  }
  const had = outfit.garments.map((g) => g.item.id)
  // Added first, so the outfit never goes empty on the way.
  for (const g of next.garments) if (!had.includes(g)) addOutfitGarment(outfit.item.id, g)
  for (const g of had) if (!next.garments.includes(g)) removeOutfitGarment(outfit.item.id, g)
  if (next.name.trim() !== outfit.name.trim()) renameOutfit(outfit.item.id, next.name)
  const added = next.collections.filter((c) => !outfit.collections.includes(c))
  addToCollections([outfit.item.id], added)
  for (const c of outfit.collections)
    if (!next.collections.includes(c)) removeFromCollection([outfit.item.id], c)
  return true
}

const what = (os: readonly OutfitView[]) =>
  os.length === 1 ? `"${outfitName(os[0]!)}"` : `${os.length} outfits`

/** Deleted to Recently deleted, their garments staying (WRD-017 4, WRD-019 2), with Undo. */
export function deleteOutfits(os: readonly OutfitView[]) {
  for (const o of os) archiveItem(o.item.id)
  toast(`Deleted ${what(os)}`, {
    action: {
      label: 'Undo',
      onClick: () => {
        for (const o of os) restoreItem(o.item.id)
      },
    },
  })
}

/** Out of one of my collections, staying in My Outfits (WRD-019 3), with Undo. */
export function takeOutOfCollection(
  os: readonly OutfitView[],
  collection: { id: string; name: string },
) {
  const ids = os.map((o) => o.item.id)
  removeFromCollection(ids, collection.id)
  toast(`Removed ${what(os)} from ${collection.name}`, {
    action: { label: 'Undo', onClick: () => addToCollections(ids, [collection.id]) },
  })
}

/** Into the Planned Outfits pane (WRD-017 3, WRD-019 4), with Undo. */
export function planOutfits(os: readonly OutfitView[]) {
  const ids = os.map((o) => o.item.id)
  addPlanned(ids)
  toast(`Added ${what(os)} to Planned outfits`, {
    action: { label: 'Undo', onClick: () => removePlanned(ids) },
  })
}

/** The builder's garments in my categories' order (WRD-014 3). */
export function builderGarments(wardrobe: WardrobeData, ids: readonly string[]): GarmentView[] {
  const at = new Map(wardrobe.lists.category.map((c, i) => [c.id, i]))
  return wardrobe.garments
    .filter((g) => ids.includes(g.item.id))
    .sort(
      (a, b) =>
        (at.get(a.row.category_id) ?? Infinity) - (at.get(b.row.category_id) ?? Infinity) ||
        a.title.localeCompare(b.title),
    )
}
