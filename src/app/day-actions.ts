import { toast } from '@/components/ui/sonner'
import {
  addPlanned,
  archiveItem,
  moveWorn,
  planGarment,
  planOutfit,
  restoreItem,
  type DayEntry,
  type Worn,
} from '@/data'
import { fromIsoDay, shortDate } from '@/lib/dates'
import { garmentCount } from './outfit-actions'
import type { Pick } from './outfits-tab'

/** "Wed 18 Nov". */
export const dayLabel = (day: string) => shortDate(fromIsoDay(day))

/**
 * Placed on a day (WRD-021 3): an outfit leaves the pane. Quietly: it shows
 * where it went, and is taken off or moved there (Joe, 20 November: the
 * toasts cluttered planning).
 */
export function place(pick: Pick, day: string) {
  if (pick.kind === 'outfit') planOutfit(pick.id, day)
  else planGarment(pick.id, day)
}

/** Moved to another day (WRD-022 2), quietly. */
export function moveEntry(entry: DayEntry, day: string) {
  if (day === entry.day) return
  moveWorn(entry.item.id, day)
}

/**
 * Taken off its day and back into the Planned outfits pane (WRD-022 4),
 * to be placed on another, quietly.
 */
export function returnToPlanned(entry: DayEntry) {
  if (!entry.outfit) return
  archiveItem(entry.item.id)
  addPlanned([entry.outfit.item.id])
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

/**
 * What a day's clothes are, on Today's and Week's card (WRD-026 1): an
 * outfit's name, else "Outfit · 4 garments"; "2 outfits"; "3 garments".
 */
export function clothesTitle(entries: readonly DayEntry[]): string {
  const outfits = entries.filter((e) => e.outfit)
  if (outfits.length > 1) return `${outfits.length} outfits`
  const one = outfits[0]?.outfit
  if (one) return one.name.trim() || `Outfit · ${garmentCount(one.garments.length)}`
  return garmentCount(entries.reduce((n, e) => n + e.garments.length, 0))
}

/** A day's clothes moved to another, all together, with Undo (WRD-026 4). */
export function moveDay(items: readonly { id: string }[], from: string, to: string) {
  if (to === from || items.length === 0) return
  for (const i of items) moveWorn(i.id, to)
  toast(`Moved the outfit to ${dayLabel(to)}`, {
    action: { label: 'Undo', onClick: () => items.forEach((i) => moveWorn(i.id, from)) },
  })
}
