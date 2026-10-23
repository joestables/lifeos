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
import { LINE_UNITS } from '@/components/lifeos'
import type { PantryEntry } from '@/data'
import { AISLES, type Aisle } from '@/lib/pantry'
import { Field } from './task-details'

const NONE = 'none'
const UNITS = LINE_UNITS.map((u) => ({ value: u || NONE, label: u || 'None' }))

/**
 * A new Pantry entry from an ingredient line (RCP-007 2, PAN-004 1): its
 * name as typed, its aisle, Cupboard to start (Joe, 20 October), and its
 * default unit, the line's to start (Joe, 23 October). Nothing is added
 * until Add; a name the Pantry has is refused.
 */
export function AddToPantryDialog({
  name: typed,
  unit: lineUnit,
  pantry,
  onAdd,
  onClose,
}: {
  name: string
  /** The line's unit, the default unit to start. */
  unit?: string | null
  pantry: ReadonlyMap<string, PantryEntry>
  onAdd: (name: string, aisle: Aisle, defaultUnit: string | null) => void
  onClose: () => void
}) {
  const ids = useId()
  const [name, setName] = useState(typed)
  const [aisle, setAisle] = useState<Aisle>('cupboard')
  const [unit, setUnit] = useState(lineUnit || NONE)
  const taken = [...pantry.values()].some(
    (p) => p.name.trim().toLowerCase() === name.trim().replace(/\s+/g, ' ').toLowerCase(),
  )
  const add = () => {
    if (!name.trim() || taken) return
    onAdd(name.trim().replace(/\s+/g, ' '), aisle, unit === NONE ? null : unit)
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
          <div className="grid grid-cols-2 gap-3">
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
            <Field label="Default unit" htmlFor={`${ids}-unit`}>
              <Select value={unit} items={UNITS} onValueChange={(v) => v && setUnit(v)}>
                <SelectTrigger id={`${ids}-unit`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
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
