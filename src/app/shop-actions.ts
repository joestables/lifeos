import { toast } from '@/components/ui/sonner'
import { updateItem, type ShoppingList } from '@/data'
import { itemTitle } from '@/lib/item-types'

/**
 * Finishing (SHP-001 5): done and off the lists, with Undo. Ticking the last
 * line offers it; Complete list, in a shop's menu and its row's, asks first
 * when lines are unticked.
 */
export function completeList(list: ShoppingList, onDone?: () => void) {
  updateItem(list.item.id, { status: 'done' })
  onDone?.()
  toast(`Completed "${itemTitle(list.item)}"`, {
    action: { label: 'Undo', onClick: () => updateItem(list.item.id, { status: 'active' }) },
  })
}

/** How many of a list's lines aren't ticked: Complete list asks first when any. */
export const untickedOf = (list: ShoppingList) => list.toBuy.filter((l) => !l.checked).length
