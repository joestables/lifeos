import { toast } from '@/components/ui/sonner'
import { updateItem, type ListView } from '@/data'
import { itemTitle } from '@/lib/item-types'

/**
 * Completing a List (NTE-006 5): done, off Notes' Lists, with Undo; Search
 * still finds it.
 */
export function completeList(list: ListView, onDone?: () => void) {
  updateItem(list.item.id, { status: 'done' })
  onDone?.()
  toast(`Completed "${itemTitle(list.item)}"`, {
    action: { label: 'Undo', onClick: () => updateItem(list.item.id, { status: 'active' }) },
  })
}

/** How many of a List's lines aren't ticked. */
export const untickedLines = (list: ListView) => list.toTick.filter((l) => !l.checked).length
