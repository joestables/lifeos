import { useId, useState } from 'react'
import { LINE_UNITS } from '@/components/lifeos'
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { addPantry, updatePantry, type PantryEntry, type PantryFields } from '@/data'
import { AISLES, nameKey, type Aisle } from '@/lib/pantry'
import { Field } from './task-details'

const NONE = 'none'
const UNITS = LINE_UNITS.map((u) => ({ value: u || NONE, label: u || 'None' }))
const AISLE_ITEMS = Object.entries(AISLES).map(([value, label]) => ({ value, label }))

/**
 * New entry, or Edit entry on one I added (PAN-001 2, 3): an ingredient or
 * a household item, its name, aisle (Cupboard to start; a household item's
 * is Household) and default unit. A name
 * the Pantry has is refused.
 */
export function PantryEntryDialog({
  entry,
  pantry,
  onClose,
}: {
  /** The entry to edit; without one, a new entry. */
  entry?: PantryEntry
  pantry: ReadonlyMap<string, PantryEntry>
  onClose: () => void
}) {
  const ids = useId()
  const [kind, setKind] = useState(entry?.kind ?? 'ingredient')
  const [name, setName] = useState(entry?.name ?? '')
  const [aisle, setAisle] = useState<Aisle>((entry?.aisle as Aisle | null) ?? 'cupboard')
  const [unit, setUnit] = useState(entry?.default_unit ?? NONE)
  const [tried, setTried] = useState(false)
  const key = nameKey(name)
  const taken = [...pantry.values()].some((p) => p.id !== entry?.id && nameKey(p.name) === key)
  const problem = !key ? 'An entry needs a name' : taken ? 'Already in the Pantry' : null

  const save = () => {
    setTried(true)
    if (problem) return
    const fields: PantryFields = {
      name: name.trim().replace(/\s+/g, ' '),
      kind,
      aisle: kind === 'ingredient' ? aisle : null,
      default_unit: unit === NONE ? null : unit,
    }
    if (entry) {
      const patch = Object.fromEntries(
        Object.entries(fields).filter(([k, v]) => entry[k as keyof PantryFields] !== v),
      ) as PantryFields
      if (Object.keys(patch).length) updatePantry(entry.id, patch)
    } else {
      addPantry({ ...fields, name: fields.name! })
    }
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-colour="green">
        <DialogHeader>
          <DialogTitle>{entry ? 'Edit entry' : 'New entry'}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <ToggleGroup
            aria-label="Kind"
            value={[kind]}
            onValueChange={(v: string[]) => v[0] && setKind(v[0])}
            className="self-start"
          >
            <ToggleGroupItem value="ingredient">Ingredient</ToggleGroupItem>
            <ToggleGroupItem value="household">Household item</ToggleGroupItem>
          </ToggleGroup>
          <Field label="Name" htmlFor={`${ids}-name`}>
            <Input
              id={`${ids}-name`}
              autoFocus
              autoComplete="off"
              value={name}
              aria-invalid={(tried && problem !== null) || undefined}
              onChange={(e) => setName(e.target.value)}
            />
            {(tried || taken) && problem && <p className="text-sm text-destructive">{problem}</p>}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Aisle" htmlFor={`${ids}-aisle`}>
              {kind === 'ingredient' ? (
                <Select
                  value={aisle}
                  items={AISLE_ITEMS}
                  onValueChange={(v) => v && setAisle(v as Aisle)}
                >
                  <SelectTrigger id={`${ids}-aisle`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AISLE_ITEMS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input id={`${ids}-aisle`} value="Household" disabled />
              )}
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
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
