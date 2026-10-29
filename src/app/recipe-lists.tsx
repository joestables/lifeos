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
import {
  addValue,
  mergeValue,
  queue,
  removeValue,
  renameValue,
  useFood,
  type FoodValue,
  type ValueKind,
} from '@/data'
import { HEADING_FIELD } from '@/lib/recipes'

const key = (name: string) => name.trim().toLowerCase()
const recipes = (n: number) => (n === 1 ? '1 recipe' : `${n} recipes`)

type Editing = { kind: 'new' } | { kind: 'rename'; value: FoodValue } | undefined

/** One name, in a small Dialog: a new one, or a new name for one. */
function NameDialog({
  one,
  values,
  editing,
  onSave,
  onDone,
}: {
  one: string
  values: readonly FoodValue[]
  editing: Editing
  onSave: (name: string) => void
  onDone: () => void
}) {
  const [name, setName] = useState(editing?.kind === 'rename' ? editing.value.name : '')
  // A new name already there is a mistake; a rename onto one is a merge.
  const taken = editing?.kind === 'new' && values.some((v) => key(v.name) === key(name))
  const save = () => {
    if (!name.trim() || taken) return
    onSave(name.trim())
  }
  return (
    <Dialog open={editing !== undefined} onOpenChange={(open) => !open && onDone()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing?.kind === 'rename' ? `Rename ${one}` : `New ${one}`}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <FieldLabel htmlFor="value-name">Name</FieldLabel>
          <Input
            id="value-name"
            data-autofocus={editing?.kind !== 'rename' || undefined}
            value={name}
            maxLength={60}
            autoComplete="off"
            aria-invalid={taken || undefined}
            onChange={(e) => setName(e.target.value)}
          />
          {taken && <p className="text-sm text-destructive">Already on the list</p>}
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={save} disabled={!name.trim() || taken}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * One of my lists (RCP-018 1): a CardRow per name with how many of my
 * Recipes use it; New, Rename (onto another name, a merge) and Delete, which
 * a name in use can't be.
 */
export function ValueListCard({
  kind,
  title,
  one,
}: {
  kind: ValueKind
  title: string
  one: string
}) {
  const food = useFood(queue)
  const values = food.values
    .filter((v) => v.kind === kind && v.person_id === food.me)
    .sort((a, b) => a.name.localeCompare(b.name))
  const field = HEADING_FIELD[kind]
  const uses = (v: FoodValue) =>
    food.recipes.filter((r) => {
      if (!r.mine) return false
      const h = r.heading[field]
      return (Array.isArray(h) ? h : [h]).some((n) => n !== null && key(n) === key(v.name))
    }).length
  const [editing, setEditing] = useState<Editing>()
  const [merging, setMerging] = useState<{ value: FoodValue; into: FoodValue }>()
  const [deleting, setDeleting] = useState<FoodValue>()
  const deletingUses = deleting ? uses(deleting) : 0
  const mergingUses = merging ? uses(merging.value) : 0

  const save = (name: string) => {
    if (editing?.kind === 'new') addValue(kind, name)
    else if (editing?.kind === 'rename') {
      const into = values.find((v) => v.id !== editing.value.id && key(v.name) === key(name))
      if (into) setMerging({ value: editing.value, into })
      else if (name !== editing.value.name) renameValue(editing.value, name)
    }
    setEditing(undefined)
  }

  return (
    <Card className="gap-1.5">
      <div className="mb-2 flex h-8 items-center gap-3">
        <h2 className="flex-1 text-h2">{title}</h2>
        <Button
          variant="outline"
          size="sm"
          aria-label={`New ${one}`}
          onClick={() => setEditing({ kind: 'new' })}
        >
          <PlusIcon /> New
        </Button>
      </div>
      {!food.isLoading && values.length === 0 && (
        <p className="text-sm text-muted-foreground">None yet</p>
      )}
      {values.map((v) => (
        <CardRow key={v.id} label={v.name} value={recipes(uses(v))}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" aria-label={`${v.name} options`} />}
            >
              <EllipsisIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditing({ kind: 'rename', value: v })}>
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setDeleting(v)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardRow>
      ))}
      <NameDialog
        key={editing?.kind === 'rename' ? editing.value.id : (editing?.kind ?? 'closed')}
        one={one}
        values={values}
        editing={editing}
        onSave={save}
        onDone={() => setEditing(undefined)}
      />
      <AlertDialog open={merging !== undefined} onOpenChange={(o) => !o && setMerging(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Merge "{merging?.value.name}" into "{merging?.into.name}"?
            </AlertDialogTitle>
            {mergingUses > 0 && (
              <AlertDialogDescription>
                {mergingUses === 1
                  ? `1 recipe moves to "${merging?.into.name}"`
                  : `${mergingUses} recipes move to "${merging?.into.name}"`}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                if (merging) mergeValue(merging.value, merging.into)
                setMerging(undefined)
              }}
            >
              Merge
            </AlertDialogAction>
            <AlertDialogCancel />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={deleting !== undefined} onOpenChange={(o) => !o && setDeleting(undefined)}>
        <AlertDialogContent>
          {deletingUses > 0 ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>"{deleting?.name}" is in use</AlertDialogTitle>
                <AlertDialogDescription>
                  {recipes(deletingUses)} {deletingUses === 1 ? 'uses' : 'use'} it. Rename it to
                  another {one} to merge them.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>OK</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{deleting?.name}"?</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => {
                    if (deleting) removeValue(deleting)
                    setDeleting(undefined)
                  }}
                >
                  Delete
                </AlertDialogAction>
                <AlertDialogCancel />
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
