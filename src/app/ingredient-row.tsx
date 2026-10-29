import { parseLine, type Unit } from '@lifeos/food'
import { PlusIcon, TypeIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { IngredientLineEditor, LINE_UNITS, Suggestions } from '@/components/lifeos'
import { Input } from '@/components/ui/input'
import { addPantry, type Line, type LineFields, type PantryEntry } from '@/data'
import { useOnLeave } from '@/hooks/use-on-leave'
import type { useReorder } from '@/hooks/use-reorder'
import { amountText, readAmount } from '@/lib/recipe-parts'
import { AISLES, pantryMatches, type Aisle } from '@/lib/pantry'
import { lineName } from '@/lib/recipes'
import { AddToPantryDialog } from './add-to-pantry'

type LineUnit = (typeof LINE_UNITS)[number]
type Reorder = ReturnType<ReturnType<typeof useReorder>['row']>
/** What a kept line has: a Variation's or a Meal's. */
export type LineValues = Pick<Line, 'pantry_id' | 'text' | 'qty' | 'qty_max' | 'approx' | 'unit'>

/**
 * An ingredient line being edited (RCP-007, MPL-006 1): the name, with
 * Pantry suggestions as it is typed, Add to the Pantry or Keep as typed;
 * the amount and unit, each kept as it is left. A new line is added once it
 * has a name. A Variation's or a Meal's: `onAdd` and `onUpdate` say whose.
 */
export function IngredientRow({
  id,
  position,
  line: l,
  pantry,
  reorder,
  onKeyDown,
  onRemove,
  onAdd,
  onUpdate,
  autoFocus,
}: {
  id: string
  position: string
  /** Kept: on the server or queued. */
  line?: LineValues
  pantry: ReadonlyMap<string, PantryEntry>
  reorder?: Reorder
  onKeyDown?: (e: React.KeyboardEvent) => void
  onRemove: () => void
  onAdd: (fields: LineFields, id: string) => void
  onUpdate: (fields: LineFields) => void
  autoFocus: boolean
}) {
  const [amount, setAmount] = useState(l ? amountText(l) : '')
  const [unit, setUnit] = useState<LineUnit>(((l?.unit as LineUnit | null) ?? '') as LineUnit)
  const [name, setName] = useState(l ? lineName(l, pantry) : '')
  // Suggestions showing, and the name changed since it was kept: Escape
  // closes the one and leaves the other.
  const [typing, setTyping] = useState(false)
  const [changed, setChanged] = useState(false)
  const [active, setActive] = useState(0)
  // Adding to the Pantry: its Dialog takes the focus, so the box's leaving waits for it.
  // `kept`: a line already kept as typed, from its mark; closing changes nothing.
  const [adding, setAdding] = useState<{
    name: string
    extra: LineFields
    kept?: boolean
  } | null>(null)
  const addingRef = useRef(false)
  const removed = useRef(false)
  const matches = typing ? pantryMatches(pantry, name) : []
  const exact = [...pantry.values()].find((p) => p.name.toLowerCase() === name.trim().toLowerCase())
  const status = changed ? 'typing' : l?.pantry_id ? 'pantry' : 'typed'

  /** Keeps the line: a new one is added, a kept one changed by what differs. */
  const keep = (fields: LineFields) => {
    if (l) {
      onUpdate(fields)
    } else if (fields.pantry_id || fields.text) {
      const amt = readAmount(amount)
      onAdd(
        {
          position,
          qty: amt?.qty ?? null,
          qty_max: amt?.qty_max ?? null,
          approx: amt?.approx ?? false,
          unit: (amt?.unit ?? unit) || null,
          ...fields,
        },
        id,
      )
    }
  }

  /** The name typed, and the amount and unit typed with it, read off. */
  const prepare = (): { typed: string; extra: LineFields } | null => {
    let typed = name.trim()
    if (!typed) {
      if (l) setName(lineName(l, pantry))
      return null
    }
    // "200 g chorizo" typed whole: its amount and unit go to their boxes.
    const parsed = parseLine(typed)
    const extra: LineFields = {}
    if (parsed.qty !== null && !amount.trim() && parsed.name) {
      typed = parsed.name
      extra.qty = parsed.qty
      extra.qty_max = parsed.qtyMax
      extra.approx = parsed.approx
      setAmount(amountText({ qty: parsed.qty, qty_max: parsed.qtyMax, approx: parsed.approx }))
      if (parsed.unit) {
        extra.unit = parsed.unit
        setUnit(parsed.unit)
      }
    }
    return { typed, extra }
  }

  /** The ingredient chosen: a Pantry entry, a new one, or as typed (RCP-007 1, 2). */
  const choose = (how: { pantry: string } | 'add' | 'typed') => {
    setTyping(false)
    setChanged(false)
    const ready = prepare()
    if (!ready) return
    const { typed, extra } = ready
    const found = typeof how === 'object' ? pantry.get(how.pantry) : undefined
    if (found) {
      setName(found.name)
      // A line with no unit takes the entry's default (Joe, 23 October).
      if (!extra.unit && !unit && found.default_unit) {
        extra.unit = found.default_unit as Unit
        setUnit(found.default_unit as LineUnit)
      }
      keep({ ...extra, pantry_id: found.id, text: null })
    } else if (how === 'add') {
      // Its aisle chosen first (Joe, 20 October).
      addingRef.current = true
      setName(typed)
      setAdding({ name: typed, extra })
    } else {
      setName(typed)
      keep({ ...extra, pantry_id: null, text: typed })
    }
  }

  /** The amount as typed, read and kept when it differs. */
  const keepAmount = () => {
    const read = readAmount(amount)
    if (!read) {
      setAmount(l ? amountText(l) : '')
      return
    }
    setAmount(amountText(read))
    if (read.unit) setUnit(read.unit)
    if (l && amountText(read) !== amountText(l)) keep(read)
    else if (l && read.unit && read.unit !== l.unit) keep({ unit: read.unit })
  }

  // Swiped back or closed mid-line: what was typed is kept (RCP-006 4).
  useOnLeave(() => {
    if (removed.current || addingRef.current) return
    if (changed) choose(exact ? { pantry: exact.id } : 'typed')
    else if (l) keepAmount()
  })

  return (
    <>
      {adding && (
        <AddToPantryDialog
          name={adding.name}
          // The line's unit, the entry's default to start (PAN-004 1).
          unit={adding.extra.unit ?? (unit || null)}
          pantry={pantry}
          onAdd={(n, aisle: Aisle, defaultUnit) => {
            setName(n)
            const id = addPantry({ name: n, aisle, default_unit: defaultUnit })
            keep({ ...adding.extra, pantry_id: id, text: null })
            addingRef.current = false
            setAdding(null)
          }}
          onClose={() => {
            // Not added: it stays as typed, so nothing typed is lost.
            if (addingRef.current && !adding.kept)
              keep({ ...adding.extra, pantry_id: null, text: adding.name })
            addingRef.current = false
            setAdding(null)
          }}
        />
      )}
      <IngredientLineEditor
        reorder={reorder}
        onKeyDown={onKeyDown}
        amount={amount}
        onAmount={setAmount}
        onAmountDone={keepAmount}
        unit={unit}
        onUnit={(u) => {
          setUnit(u)
          if (l) keep({ unit: (u as Unit) || null })
        }}
        ingredient={name}
        status={status}
        onAddToPantry={
          status === 'typed' && l && name.trim()
            ? () => {
                addingRef.current = true
                setAdding({ name: name.trim(), extra: {}, kept: true })
              }
            : undefined
        }
        onRemove={() => {
          removed.current = true
          onRemove()
        }}
        ingredientField={
          <Suggestions
            open={typing && name.trim() !== ''}
            onDismiss={() => setTyping(false)}
            title="Pantry"
            query={name}
            items={matches.map((p) => ({
              key: p.id,
              label: p.name,
              meta: p.aisle ? AISLES[p.aisle as Aisle] : undefined,
            }))}
            active={Math.min(active, Math.max(matches.length - 1, 0))}
            onChoose={(id) => choose({ pantry: id })}
            actions={[
              ...(exact
                ? []
                : [
                    {
                      key: 'add',
                      label: `Add "${name.trim()}" to the Pantry`,
                      icon: <PlusIcon />,
                      onClick: () => choose('add'),
                    },
                  ]),
              {
                key: 'typed',
                label: 'Keep as typed',
                icon: <TypeIcon />,
                onClick: () => choose('typed'),
              },
            ]}
            field={
              <Input
                aria-label="Ingredient"
                autoComplete="off"
                autoFocus={autoFocus}
                className="pr-9"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setTyping(true)
                  setChanged(true)
                  setActive(0)
                }}
                onBlur={() => {
                  if (!changed || addingRef.current) return
                  choose(exact ? { pantry: exact.id } : 'typed')
                }}
                onKeyDown={(e) => {
                  if (!changed) return
                  if (typing && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                    e.preventDefault()
                    if (!matches.length) return
                    const step = e.key === 'ArrowDown' ? 1 : -1
                    setActive((a) => (a + step + matches.length) % matches.length)
                  } else if (e.key === 'Enter') {
                    e.preventDefault()
                    const pick = matches[Math.min(active, matches.length - 1)]
                    choose(pick ? { pantry: pick.id } : exact ? { pantry: exact.id } : 'typed')
                  } else if (e.key === 'Escape') {
                    setTyping(false)
                  }
                }}
              />
            }
          />
        }
      />
    </>
  )
}
