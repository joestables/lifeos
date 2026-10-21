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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { mergePantry, updatePantry, type PantryEntry } from '@/data'
import { mergeable, nameKey, type PantryRecipe } from '@/lib/pantry'
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
          <DialogTitle>{entry.name}</DialogTitle>
        </DialogHeader>
        {recipes.length ? (
          <div className="-mx-3 flex flex-col">
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
 * Merging an entry I added with another I added of the same kind (PAN-003):
 * the other's lines and staples move to this one, which keeps the name
 * chosen. The entries offered are only mine, so Merge is never offered on
 * someone else's.
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
  const [name, setName] = useState(entry.name)
  const key = nameKey(name)
  const taken = [...pantry.values()].some(
    (p) => p.id !== entry.id && p.id !== into && nameKey(p.name) === key,
  )
  const problem = !key ? 'An entry needs a name' : taken ? 'Already in the Pantry' : null
  const items = others.map((o) => ({ value: o.id, label: o.name }))
  const merge = () => {
    if (problem || !into) return
    mergePantry(entry.id, into)
    const kept = name.trim().replace(/\s+/g, ' ')
    if (kept !== entry.name) updatePantry(entry.id, { name: kept })
    onClose()
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-colour="green">
        <DialogHeader>
          <DialogTitle>Merge</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            merge()
          }}
        >
          <Field label="Merge with" htmlFor={`${ids}-into`}>
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
          <Field label="Name" htmlFor={`${ids}-name`}>
            <Input
              id={`${ids}-name`}
              autoComplete="off"
              value={name}
              aria-invalid={problem !== null || undefined}
              onChange={(e) => setName(e.target.value)}
            />
            {problem && <p className="text-sm text-destructive">{problem}</p>}
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={problem !== null || !into}>
              Merge
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
