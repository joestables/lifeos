import { EllipsisIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { CardRow } from '@/components/lifeos'
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
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label as FieldLabel } from '@/components/ui/label'
import { createLabel, deleteLabel, queue, renameLabel, useLabels, type Label } from '@/data'

type Editing = { kind: 'new' } | { kind: 'rename'; label: Label } | undefined

/** One name, in a small Dialog: a new Label, or a new name for one. */
function NameDialog({ editing, onDone }: { editing: Editing; onDone: () => void }) {
  const [name, setName] = useState(editing?.kind === 'rename' ? editing.label.name : '')
  const save = () => {
    if (!name.trim() || !editing) return
    if (editing.kind === 'new') createLabel(name)
    else renameLabel(editing.label.id, name)
    onDone()
  }
  return (
    <Dialog open={editing !== undefined} onOpenChange={(open) => !open && onDone()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing?.kind === 'rename' ? 'Rename label' : 'New label'}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <FieldLabel htmlFor="label-name">Name</FieldLabel>
          <Input
            id="label-name"
            value={name}
            maxLength={60}
            autoComplete="off"
            onChange={(e) => setName(e.target.value)}
          />
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={save} disabled={!name.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * My Labels: make, rename and delete them (ITM-005). On their own page the
 * card has no title, and the page's main action makes a Label (`adding`).
 */
export function LabelsCard({
  titled = true,
  adding = false,
  onAddingChange,
}: {
  titled?: boolean
  adding?: boolean
  onAddingChange?: (adding: boolean) => void
}) {
  const { labels } = useLabels(queue)
  const [chosen, setEditing] = useState<Editing>()
  const editing: Editing = adding ? { kind: 'new' } : chosen
  const [deleting, setDeleting] = useState<(Label & { count: number }) | undefined>()
  return (
    <Card className="gap-1.5">
      {titled && (
        <div className="mb-2 flex h-8 items-center gap-3">
          <h2 className="flex-1 text-h2">Labels</h2>
          <Button variant="outline" size="sm" onClick={() => setEditing({ kind: 'new' })}>
            <PlusIcon /> New label
          </Button>
        </div>
      )}
      {labels.length === 0 && <p className="text-sm text-muted-foreground">No labels yet</p>}
      {labels.map((label) => (
        <CardRow key={label.id} label={label.name} value={label.count}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label={`${label.name} options`} />
              }
            >
              <EllipsisIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditing({ kind: 'rename', label })}>
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setDeleting(label)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardRow>
      ))}
      <NameDialog
        key={editing?.kind === 'rename' ? editing.label.id : (editing?.kind ?? 'closed')}
        editing={editing}
        onDone={() => {
          setEditing(undefined)
          onAddingChange?.(false)
        }}
      />
      <AlertDialog open={deleting !== undefined} onOpenChange={(o) => !o && setDeleting(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleting?.name}"?</AlertDialogTitle>
            {deleting && deleting.count > 0 && (
              <AlertDialogDescription>
                {deleting.count === 1
                  ? 'It comes off 1 Note or Task'
                  : `It comes off ${deleting.count} Notes and Tasks`}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleting) deleteLabel(deleting.id)
                setDeleting(undefined)
              }}
            >
              Delete
            </AlertDialogAction>
            <AlertDialogCancel />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
