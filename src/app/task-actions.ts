import { toast } from '@/components/ui/sonner'
import { updateItem, type Item } from '@/data'
import { itemTitle } from '@/lib/item-types'

/** Parked for someday, without its do-on date (TSK-007), with Undo. */
export function toSomeday(task: Item) {
  const was = { status: task.status, do_on: task.do_on, do_at: task.do_at }
  updateItem(task.id, { status: 'idea', do_on: null, do_at: null })
  toast(`Moved "${itemTitle(task)}" to Someday`, {
    action: { label: 'Undo', onClick: () => updateItem(task.id, was) },
  })
}
