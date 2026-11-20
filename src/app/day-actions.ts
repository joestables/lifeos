import { toast } from '@/components/ui/sonner'
import {
  addPlanned,
  archiveItem,
  moveWorn,
  planGarment,
  planOutfit,
  restoreItem,
  type DayEntry,
  type WardrobeData,
  type Worn,
} from '@/data'
import { fromIsoDay, shortDate } from '@/lib/dates'
import { outfitName } from './outfit-actions'
import type { Pick } from './outfits-tab'

/** "Wed 18 Nov". */
export const dayLabel = (day: string) => shortDate(fromIsoDay(day))

/** Placed on a day, with Undo (WRD-021 3): an outfit goes back into the pane. */
export function place(pick: Pick, day: string, wardrobe: WardrobeData) {
  if (pick.kind === 'outfit') {
    const o = wardrobe.outfits.find((x) => x.item.id === pick.id)
    const wasPlanned = o?.planned ?? false
    const id = planOutfit(pick.id, day)
    toast(`Planned ${o ? `"${outfitName(o)}"` : 'outfit'} for ${dayLabel(day)}`, {
      action: {
        label: 'Undo',
        onClick: () => {
          archiveItem(id)
          if (wasPlanned) addPlanned([pick.id])
        },
      },
    })
  } else {
    const g = wardrobe.garments.find((x) => x.item.id === pick.id)
    const id = planGarment(pick.id, day)
    toast(`Planned ${g ? `"${g.title}"` : 'garment'} for ${dayLabel(day)}`, {
      action: { label: 'Undo', onClick: () => archiveItem(id) },
    })
  }
}

/** Moved to another day, with Undo (WRD-022 2). */
export function moveEntry(entry: DayEntry, day: string) {
  if (day === entry.day) return
  const from = entry.day
  moveWorn(entry.item.id, day)
  toast(`Moved to ${dayLabel(day)}`, {
    action: { label: 'Undo', onClick: () => moveWorn(entry.item.id, from) },
  })
}

/** Taken off its day, with Undo (WRD-022 3). */
export function removeEntry(entry: DayEntry) {
  archiveItem(entry.item.id)
  toast(`Removed from ${dayLabel(entry.day)}`, {
    action: { label: 'Undo', onClick: () => restoreItem(entry.item.id) },
  })
}

/** "Worn 3× · last Mon 16 Nov", or "Not worn yet" (WRD-024 2). */
export function wornSays(worn: Worn): string {
  return worn.times ? `Worn ${worn.times}× · last ${dayLabel(worn.last!)}` : 'Not worn yet'
}
