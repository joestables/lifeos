import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { ShoppingList } from '@/data'
import { itemTitle } from '@/lib/item-types'
import { completeList, untickedOf } from './shop-actions'

/** Complete list with lines unticked (SHP-001 5): asked first. */
export function CompleteListDialog({
  list,
  onClose,
  onDone,
}: {
  list: ShoppingList
  onClose: () => void
  onDone?: () => void
}) {
  const unticked = untickedOf(list)
  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Complete {itemTitle(list.item)}?</AlertDialogTitle>
          <AlertDialogDescription>
            {unticked === 1 ? "1 line isn't ticked." : `${unticked} lines aren't ticked.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={() => {
              completeList(list, onDone)
              onClose()
            }}
          >
            Complete
          </AlertDialogAction>
          <AlertDialogCancel />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
