import { toast } from '@/components/ui/sonner'
import { archiveItem, restoreItem, type Item } from '@/data'
import { itemTitle } from '@/lib/item-types'

/*
 * Deleting a repeating Item asks which (ITM-002 3, Joe, 14 November): this
 * one, or this and all following. Asked from wherever Delete is pressed,
 * so it is held here and shown by the one DeleteRepeating in the app
 * (delete-repeating-dialog.tsx).
 */

let asking: Item | null = null
const listeners = new Set<() => void>()
/** The Item being asked about, if any. */
export const askingNow = () => asking
export const setAsking = (next: Item | null) => {
  asking = next
  for (const l of listeners) l()
}
export const subscribeAsking = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Deletes one occurrence (or an Item that doesn't repeat), with Undo. */
export function deleteOne(item: Item) {
  archiveItem(item.id)
  toast(`Deleted "${itemTitle(item)}"`, {
    action: { label: 'Undo', onClick: () => restoreItem(item.id) },
  })
}

/** Delete: a repeating Item asks this one or all following; any other goes at once. */
export function deleteItem(item: Item) {
  if (item.series_id && item.occurrence_on) setAsking(item)
  else deleteOne(item)
}
