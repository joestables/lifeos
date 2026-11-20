import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createItem, queue, updateItem, useFoodSpaces, type Item, type ListView } from '@/data'
import { itemTitle } from '@/lib/item-types'
import { completeList, untickedLines } from './list-actions'
import { SpaceSelect } from './space-select'

/**
 * A List's name and, with a Household, who it's for (NTE-007 1): New list's
 * fields, and Edit details…'s.
 */
function ListFields({
  title,
  onTitle,
  space,
  onSpace,
}: {
  title: string
  onTitle: (title: string) => void
  space: string
  onSpace: (space: string) => void
}) {
  const spaces = useFoodSpaces(queue)
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="list-name">Name</Label>
        <Input
          id="list-name"
          data-autofocus
          value={title}
          onChange={(e) => onTitle(e.target.value)}
        />
      </div>
      {spaces.spaces.length > 1 && (
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label>For</Label>
          <SpaceSelect
            label="For"
            size="default"
            className="w-full"
            spaces={spaces.spaces}
            value={space}
            onChange={onSpace}
          />
        </div>
      )}
    </>
  )
}

/**
 * New list (NTE-007 1): its name and, with a Household, who it's for
 * (Personal to start); no date. Made, it opens on its page.
 */
export function NewListDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const spaces = useFoodSpaces(queue)
  const [title, setTitle] = useState('')
  const [space, setSpace] = useState<string | null>(null)
  const forSpace = space ?? spaces.personal ?? ''
  const create = () => {
    if (!title.trim()) return
    const id = createItem('list', {
      title: title.trim(),
      ...(forSpace && { space_id: forSpace }),
    })
    onClose()
    void navigate({ to: '/lists/$id', params: { id } })
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New list</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            create()
          }}
        >
          <ListFields title={title} onTitle={setTitle} space={forSpace} onSpace={setSpace} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Edit details… (NTE-007 1): a List's name and who it's for. */
export function ListDetailsDialog({ item, onClose }: { item: Item; onClose: () => void }) {
  const [title, setTitle] = useState(item.title)
  const [space, setSpace] = useState(item.space_id)
  const save = () => {
    if (!title.trim()) return
    const patch = {
      ...(title.trim() !== item.title && { title: title.trim() }),
      ...(space !== item.space_id && { space_id: space }),
    }
    if (Object.keys(patch).length) updateItem(item.id, patch)
    onClose()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>List details</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <ListFields title={title} onTitle={setTitle} space={space} onSpace={setSpace} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Complete a List? (NTE-006 5): asked when its last line is ticked
 * ("Everything's ticked", Not yet), and by Complete list while lines aren't
 * ticked ("3 items aren't ticked", Cancel).
 */
export function CompleteListDialog({
  list,
  allTicked,
  onClose,
  onDone,
}: {
  list: ListView
  /** Asked because the last line was just ticked. */
  allTicked: boolean
  onClose: () => void
  onDone?: () => void
}) {
  const unticked = untickedLines(list)
  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Complete {itemTitle(list.item)}?</AlertDialogTitle>
          <AlertDialogDescription>
            {allTicked
              ? "Everything's ticked"
              : unticked === 1
                ? "1 item isn't ticked"
                : `${unticked} items aren't ticked`}
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
          <AlertDialogCancel>{allTicked ? 'Not yet' : 'Cancel'}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
