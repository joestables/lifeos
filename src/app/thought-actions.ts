import { toast } from '@/components/ui/sonner'
import { updateItem, type Item } from '@/data'
import { itemTitle } from '@/lib/item-types'

/** A Thought ticked off: done, it leaves Inbox, with Undo (INB-006). Unticked, it's back. */
export function tickThought(thought: Item, on: boolean) {
  updateItem(thought.id, { status: on ? 'done' : 'active' })
  if (on)
    toast(`Done "${itemTitle(thought)}"`, {
      action: { label: 'Undo', onClick: () => updateItem(thought.id, { status: 'active' }) },
    })
}
