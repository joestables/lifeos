import { useSyncExternalStore } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from '@/components/ui/sonner'
import { deleteFollowing } from '@/data'
import { itemTitle, typeLook } from '@/lib/item-types'
import { askingNow, deleteOne, setAsking, subscribeAsking } from './delete-repeating'

/** Delete a repeating Item: this one, or this and all following (ITM-002 3). */
export function DeleteRepeating() {
  const item = useSyncExternalStore(subscribeAsking, askingNow)
  const noun = item ? typeLook(item.type).label.toLowerCase() : ''
  return (
    <AlertDialog open={item !== null} onOpenChange={(o) => !o && setAsking(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete a repeating {noun}</AlertDialogTitle>
        </AlertDialogHeader>
        {/* Three choices: stacked, the widest first, so none wraps alone. */}
        <AlertDialogFooter className="grid justify-stretch">
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              if (!item) return
              deleteFollowing(item.id)
              toast(`Deleted "${itemTitle(item)}" and all following`)
              setAsking(null)
            }}
          >
            This and all following
          </AlertDialogAction>
          <AlertDialogAction
            variant="outline"
            onClick={() => {
              if (item) deleteOne(item)
              setAsking(null)
            }}
          >
            This {noun}
          </AlertDialogAction>
          <AlertDialogCancel />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
