import type { GarmentFace } from '@/components/lifeos'
import type { GarmentView } from '@/data'

/** What a garment's line shows: its photo, brand, colour and category. */
export function garmentFace(g: GarmentView, photo?: string): GarmentFace {
  return {
    id: g.item.id,
    ...(photo && { photo }),
    brand: g.brand?.name ?? '',
    category: g.category?.name ?? '',
    size: g.size?.name ?? '',
    colour: { name: g.colour?.name ?? '', hex: g.colour?.hex ?? '' },
    ...(g.fit && { fit: g.fit.name }),
    tags: g.tags.map((t) => t.name),
    retired: g.retired,
    favourite: g.favourite,
    ...(g.sync && { sync: g.sync }),
  }
}
