import { useId, useState } from 'react'
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
import type { PantryEntry } from '@/data'
import { AISLES, type Aisle } from '@/lib/pantry'
import { Field } from './task-details'

/**
 * A new Pantry entry from an ingredient line (RCP-007 2): its name as typed
 * and its aisle, Cupboard to start (Joe, 20 October). Nothing is added until
 * Add; a name the Pantry has is refused.
 */
export function AddToPantryDialog({
  name: typed,
  pantry,
  onAdd,
  onClose,
}: {
  name: string
  pantry: ReadonlyMap<string, PantryEntry>
  onAdd: (name: string, aisle: Aisle) => void
  onClose: () => void
}) {
  const ids = useId()
  const [name, setName] = useState(typed)
  const [aisle, setAisle] = useState<Aisle>('cupboard')
  const taken = [...pantry.values()].some(
    (p) => p.name.trim().toLowerCase() === name.trim().replace(/\s+/g, ' ').toLowerCase(),
  )
  const add = () => {
    if (!name.trim() || taken) return
    onAdd(name.trim().replace(/\s+/g, ' '), aisle)
    onClose()
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-colour="green">
        <DialogHeader>
          <DialogTitle>Add to the Pantry</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <Field label="Name" htmlFor={`${ids}-name`}>
            <Input
              id={`${ids}-name`}
              autoComplete="off"
              value={name}
              aria-invalid={taken || undefined}
              onChange={(e) => setName(e.target.value)}
            />
            {taken && <p className="text-sm text-destructive">Already in the Pantry</p>}
          </Field>
          <Field label="Aisle" htmlFor={`${ids}-aisle`}>
            <Select
              value={aisle}
              items={Object.entries(AISLES).map(([value, label]) => ({ value, label }))}
              onValueChange={(v) => v && setAisle(v as Aisle)}
            >
              <SelectTrigger id={`${ids}-aisle`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AISLES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || taken}>
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
