import { useNavigate } from '@tanstack/react-router'
import { ChefHatIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { ItemRow, TypeTile } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import { mergePantry, type PantryEntry } from '@/data'
import { mergeable, type PantryRecipe } from '@/lib/pantry'
import { Field } from './task-details'

/** Recipes that use an entry (PAN-001 5), each opening its Recipe. */
export function RecipesUsingDialog({
  entry,
  recipes,
  onClose,
}: {
  entry: PantryEntry
  recipes: readonly PantryRecipe[]
  onClose: () => void
}) {
  const navigate = useNavigate()
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-colour="green">
        <DialogHeader>
          <DialogTitle>Recipes using {entry.name}</DialogTitle>
        </DialogHeader>
        {recipes.length ? (
          <div className="flex flex-col gap-1.5">
            {recipes.map((r) => (
              <ItemRow
                key={r.id}
                leading={<TypeTile colour="green" icon={ChefHatIcon} size="sm" />}
                title={r.name}
                onOpen={() => void navigate({ to: '/recipes/$id', params: { id: r.id } })}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No recipes use it</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Merging an entry I added into another I added of the same kind (PAN-003,
 * Joe, 23 October): this one's lines and staples move to the one chosen,
 * which keeps its name and aisle; this one goes. The entries offered are
 * only mine, so Merge is never offered on someone else's.
 */
export function MergeDialog({
  entry,
  pantry,
  me,
  onClose,
}: {
  entry: PantryEntry
  pantry: ReadonlyMap<string, PantryEntry>
  me: string
  onClose: () => void
}) {
  const ids = useId()
  const others = mergeable(entry, pantry, me)
  // Nothing chosen to start: a wrong merge is never one tap away.
  const [into, setInto] = useState('')
  const items = others.map((o) => ({ value: o.id, label: o.name }))
  const merge = () => {
    const kept = pantry.get(into)
    if (!kept) return
    mergePantry(kept.id, entry.id)
    toast(`Merged "${entry.name}" into "${kept.name}"`)
    onClose()
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-colour="green">
        <DialogHeader>
          <DialogTitle>Merge "{entry.name}"</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            merge()
          }}
        >
          <Field label="Merge into" htmlFor={`${ids}-into`}>
            <Select value={into} items={items} onValueChange={(v) => v && setInto(v)}>
              <SelectTrigger id={`${ids}-into`} className="w-full">
                <SelectValue placeholder="Choose an entry" />
              </SelectTrigger>
              <SelectContent>
                {items.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!into}>
              Merge
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
