import { parseLine, type Unit } from '@lifeos/food'
import { PlusIcon, SparklesIcon, TypeIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import {
  IngredientLineEditor,
  LINE_UNITS,
  RecipeColumns,
  RecipePanel,
  STEP_FIELD,
  StepEditor,
  SubheadingEditor,
  Suggestions,
  VariationFieldsCard,
} from '@/components/lifeos'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  addLine,
  addPantry,
  addStep,
  fillFromMethod,
  newId,
  positionBetween,
  removeLine,
  removeStep,
  updateItem,
  updateLine,
  updateStep,
  updateVariation,
  type FoodData,
  type Line,
  type LineFields,
  type PantryEntry,
} from '@/data'
import type { RecipeView, VariationView } from '@/data/food-hooks'
import { useOnLeave } from '@/hooks/use-on-leave'
import { useReorder } from '@/hooks/use-reorder'
import {
  STATE_NAMES,
  amountText,
  byPosition,
  editableText,
  readAmount,
  storedText,
} from '@/lib/recipe-parts'
import { AISLES, type Aisle } from '@/lib/pantry'
import { lineName } from '@/lib/recipes'
import { AddToPantryDialog } from './add-to-pantry'
import { AI_REFUSALS } from './ai-words'
import { ImportDialog } from './import-dialog'
import { importInto, linesFrom, replaceLines } from './variation-ai'
import { LinksField } from './links-field'
import { titlesOf } from './recipe-helpers'
import { Field } from './task-details'
import { ReferenceField } from './reference-field'

type LineUnit = (typeof LINE_UNITS)[number]

/** A row of the ingredients being edited: a line or a subheading, kept or not yet. */
interface Row {
  id: string
  position: string
  heading: boolean
  /** Kept: on the server or queued. */
  line?: Line
}

/** Pantry entries for a typed name: names starting with it first, up to six. */
function pantryMatches(pantry: ReadonlyMap<string, PantryEntry>, query: string): PantryEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return [...pantry.values()]
    .filter((p) => p.name.toLowerCase().includes(q))
    .sort((a, b) => {
      const x = a.name.toLowerCase().startsWith(q) ? 0 : 1
      const y = b.name.toLowerCase().startsWith(q) ? 0 : 1
      return x - y || a.name.localeCompare(b.name)
    })
    .slice(0, 6)
}

function IngredientRow({
  row,
  variation,
  pantry,
  reorder,
  onKeyDown,
  onRemove,
  autoFocus,
}: {
  row: Row
  variation: string
  pantry: ReadonlyMap<string, PantryEntry>
  reorder: ReturnType<ReturnType<typeof useReorder>['row']>
  onKeyDown: (e: React.KeyboardEvent) => void
  onRemove: () => void
  autoFocus: boolean
}) {
  const l = row.line
  const [amount, setAmount] = useState(l ? amountText(l) : '')
  const [unit, setUnit] = useState<LineUnit>(((l?.unit as LineUnit | null) ?? '') as LineUnit)
  const [name, setName] = useState(l ? lineName(l, pantry) : '')
  // Suggestions showing, and the name changed since it was kept: Escape
  // closes the one and leaves the other.
  const [typing, setTyping] = useState(false)
  const [changed, setChanged] = useState(false)
  const [active, setActive] = useState(0)
  // Adding to the Pantry: its Dialog takes the focus, so the box's leaving waits for it.
  const [adding, setAdding] = useState<{ name: string; extra: LineFields } | null>(null)
  const addingRef = useRef(false)
  const removed = useRef(false)
  const matches = typing ? pantryMatches(pantry, name) : []
  const exact = [...pantry.values()].find((p) => p.name.toLowerCase() === name.trim().toLowerCase())
  const status = changed ? 'typing' : l?.pantry_id ? 'pantry' : 'typed'

  /** Keeps the line: a new one is added, a kept one changed by what differs. */
  const keep = (fields: LineFields) => {
    if (l) {
      updateLine(variation, row.id, fields)
    } else if (fields.pantry_id || fields.text) {
      const amt = readAmount(amount)
      addLine(
        variation,
        {
          position: row.position,
          qty: amt?.qty ?? null,
          qty_max: amt?.qty_max ?? null,
          approx: amt?.approx ?? false,
          unit: (amt?.unit ?? unit) || null,
          ...fields,
        },
        row.id,
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
          pantry={pantry}
          onAdd={(n, aisle: Aisle) => {
            setName(n)
            // The line's unit becomes the entry's default (PAN-004 1).
            const lineUnit = adding.extra.unit ?? (unit || null)
            const id = addPantry({ name: n, aisle, default_unit: lineUnit })
            keep({ ...adding.extra, pantry_id: id, text: null })
            addingRef.current = false
            setAdding(null)
          }}
          onClose={() => {
            // Not added: it stays as typed, so nothing typed is lost.
            if (addingRef.current) keep({ ...adding.extra, pantry_id: null, text: adding.name })
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

function SubheadingRow({
  row,
  variation,
  reorder,
  onKeyDown,
  onRemove,
  autoFocus,
}: {
  row: Row
  variation: string
  reorder: ReturnType<ReturnType<typeof useReorder>['row']>
  onKeyDown: (e: React.KeyboardEvent) => void
  onRemove: () => void
  autoFocus: boolean
}) {
  const [value, setValue] = useState(row.line?.heading ?? '')
  const ref = useRef<HTMLDivElement>(null)
  const removed = useRef(false)
  const done = () => {
    const v = value.trim()
    if (!v) {
      if (row.line) setValue(row.line.heading ?? '')
      return
    }
    if (!row.line) addLine(variation, { position: row.position, heading: v }, row.id)
    else if (v !== row.line.heading) updateLine(variation, row.id, { heading: v })
  }
  useOnLeave(() => !removed.current && done())
  useEffect(() => {
    if (autoFocus) ref.current?.querySelector('input')?.focus()
  }, [autoFocus])
  return (
    <div ref={ref}>
      <SubheadingEditor
        value={value}
        reorder={reorder}
        onKeyDown={onKeyDown}
        onChange={setValue}
        onDone={done}
        onRemove={() => {
          removed.current = true
          onRemove()
        }}
      />
    </div>
  )
}

/** Moves one of several rows ordered by position to an index; returns its new position. */
function movedPosition(rows: readonly { id: string; position: string }[], id: string, to: number) {
  const rest = rows.filter((r) => r.id !== id)
  return positionBetween(rest[to - 1]?.position ?? null, rest[to]?.position ?? null)
}

/**
 * Fill from method (RCP-007 5): the lines the method uses, in place of the
 * lines there are, asked first when there are some; Undo puts them back.
 */
function useFill(variation: VariationView) {
  const [asking, setAsking] = useState(false)
  const [filling, setFilling] = useState(false)
  const steps = variation.steps
    .slice()
    .sort(byPosition)
    .map((s) => s.text)
    .filter((t) => t.trim())
  const fill = async () => {
    setAsking(false)
    setFilling(true)
    const answer = await fillFromMethod(steps)
    setFilling(false)
    if (!answer.ok) {
      toast(AI_REFUSALS[answer.reason])
      return
    }
    const undo = replaceLines(variation, linesFrom(answer.lines))
    toast('Ingredients filled from the method', { action: { label: 'Undo', onClick: undo } })
  }
  const start = () => {
    if (variation.lines.length) setAsking(true)
    else void fill()
  }
  return { asking, setAsking, filling, start, fill, empty: steps.length === 0 }
}

function Ingredients({
  variation,
  pantry,
}: {
  variation: VariationView
  pantry: FoodData['pantry']
}) {
  const v = variation.item.id
  const filler = useFill(variation)
  const [fresh, setFresh] = useState<Row[]>([])
  const [focus, setFocus] = useState<string | null>(null)
  const kept = new Set(variation.lines.map((l) => l.id))
  const rows: Row[] = [
    ...variation.lines.map((l) => ({
      id: l.id,
      position: l.position,
      heading: l.heading !== null,
      line: l,
    })),
    ...fresh.filter((r) => !kept.has(r.id)),
  ].sort(byPosition)
  const ids = rows.map((r) => r.id)
  const reorder = useReorder(ids, (id, to) => {
    const position = movedPosition(rows, id, to)
    if (kept.has(id)) updateLine(v, id, { position })
    else setFresh((f) => f.map((r) => (r.id === id ? { ...r, position } : r)))
  })
  const add = (heading: boolean) => {
    const id = newId()
    setFresh((f) => [
      ...f,
      { id, heading, position: positionBetween(rows.at(-1)?.position ?? null, null) },
    ])
    setFocus(id)
  }
  const remove = (id: string) => {
    if (kept.has(id)) removeLine(v, id)
    setFresh((f) => f.filter((r) => r.id !== id))
  }

  return (
    <RecipePanel
      title="Ingredients"
      action={
        <Button
          variant="ghost"
          size="sm"
          disabled={filler.empty || filler.filling}
          onClick={filler.start}
        >
          <SparklesIcon /> Fill from method
        </Button>
      }
    >
      <AlertDialog open={filler.asking} onOpenChange={filler.setAsking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace the ingredients?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => void filler.fill()}>Replace</AlertDialogAction>
            <AlertDialogCancel />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex flex-col gap-2" aria-busy={filler.filling || undefined}>
        {filler.filling && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}
        {!filler.filling &&
          rows.map((r) =>
            r.heading ? (
              <SubheadingRow
                key={r.id}
                row={r}
                variation={v}
                reorder={reorder.row(r.id)}
                onKeyDown={reorder.keys(r.id)}
                onRemove={() => remove(r.id)}
                autoFocus={focus === r.id}
              />
            ) : (
              <IngredientRow
                key={r.id}
                row={r}
                variation={v}
                pantry={pantry}
                reorder={reorder.row(r.id)}
                onKeyDown={reorder.keys(r.id)}
                onRemove={() => remove(r.id)}
                autoFocus={focus === r.id}
              />
            ),
          )}
        <div className="flex flex-wrap gap-1 pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => add(false)}
          >
            <PlusIcon /> Add an ingredient
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => add(true)}
          >
            <PlusIcon /> Add a subheading
          </Button>
        </div>
      </div>
    </RecipePanel>
  )
}

interface StepRow {
  id: string
  position: string
  text: string
  kept: boolean
}

function Method({
  variation,
  food,
  recipe,
}: {
  variation: VariationView
  food: FoodData
  recipe: RecipeView
}) {
  const v = variation.item.id
  const titles = titlesOf(food)
  const [importing, setImporting] = useState(false)
  // What each step's "@Name"s stand for, as typed and chosen.
  const [refs] = useState(() => new Map<string, Map<string, string>>())
  const refsOf = (id: string) => {
    let m = refs.get(id)
    if (!m) refs.set(id, (m = new Map()))
    return m
  }
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [fresh, setFresh] = useState<StepRow[]>([])
  const [focus, setFocus] = useState<string | null>(null)
  const kept = new Set(variation.steps.map((s) => s.id))
  const rows: StepRow[] = [
    ...variation.steps.map((s) => {
      const e = editableText(s.text, titles)
      for (const [name, id] of e.refs) refsOf(s.id).set(name, id)
      return { id: s.id, position: s.position, text: e.text, kept: true }
    }),
    ...fresh.filter((r) => !kept.has(r.id)),
  ].sort(byPosition)
  const reorder = useReorder(
    rows.map((r) => r.id),
    (id, to) => {
      const position = movedPosition(rows, id, to)
      if (kept.has(id)) updateStep(v, id, { position })
      else setFresh((f) => f.map((r) => (r.id === id ? { ...r, position } : r)))
    },
  )
  const addAfter = (after?: StepRow) => {
    const i = after ? rows.indexOf(after) : rows.length - 1
    const id = newId()
    setFresh((f) => [
      ...f,
      {
        id,
        text: '',
        kept: false,
        position: positionBetween(rows[i]?.position ?? null, rows[i + 1]?.position ?? null),
      },
    ])
    setFocus(id)
  }
  const commit = (r: StepRow) => {
    const draft = drafts[r.id]
    if (draft === undefined) return
    const text = storedText(draft, refsOf(r.id)).trim()
    setDrafts((d) => {
      const next = { ...d }
      delete next[r.id]
      return next
    })
    if (!r.kept) {
      if (text.trim()) addStep(v, text, r.position)
      setFresh((f) => f.filter((x) => x.id !== r.id))
    } else if (!text.trim()) removeStep(v, r.id)
    else if (text !== variation.steps.find((s) => s.id === r.id)?.text)
      updateStep(v, r.id, { text })
  }

  useOnLeave(() => {
    for (const r of rows) commit(r)
  })

  return (
    <RecipePanel
      title="Method"
      action={
        // A Draft only (Joe, 23 October).
        variation.item.status === 'active' ? (
          <Button variant="ghost" size="sm" onClick={() => setImporting(true)}>
            <SparklesIcon /> Import from a link
          </Button>
        ) : undefined
      }
    >
      {importing && (
        <ImportDialog
          food={food}
          into={{
            replacing:
              variation.lines.length > 0 || variation.steps.some((s) => s.text.trim() !== ''),
          }}
          onClose={() => setImporting(false)}
          onChecked={({ recipe: imported, link }) => {
            setImporting(false)
            setDrafts({})
            setFresh([])
            const undo = importInto(variation, imported, link)
            toast('Imported the ingredients and method', {
              action: { label: 'Undo', onClick: undo },
            })
          }}
        />
      )}
      <div className="flex flex-col gap-2.5">
        {rows.map((r, i) => (
          <StepEditor
            key={r.id}
            n={i + 1}
            reorder={reorder.row(r.id)}
            onRemove={() => {
              if (r.kept) removeStep(v, r.id)
              setFresh((f) => f.filter((x) => x.id !== r.id))
            }}
            field={
              <ReferenceField
                label={`Step ${i + 1}`}
                className={STEP_FIELD}
                autoFocus={focus === r.id}
                value={drafts[r.id] ?? r.text}
                onChange={(text) => setDrafts((d) => ({ ...d, [r.id]: text }))}
                onCommit={() => commit(r)}
                onEnter={() => addAfter(r)}
                onKeyDown={reorder.keys(r.id)}
                refs={refsOf(r.id)}
                recipes={food.recipes}
                except={recipe.item.id}
              />
            }
          />
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="self-start text-muted-foreground"
          onClick={() => addAfter()}
        >
          <PlusIcon /> Add a step
        </Button>
      </div>
    </RecipePanel>
  )
}

function NotesAndSources({
  variation,
  food,
  recipe,
}: {
  variation: VariationView
  food: FoodData
  recipe: RecipeView
}) {
  const v = variation.item.id
  const [initial] = useState(() => editableText(variation.fields.notes ?? '', titlesOf(food)))
  const [notes, setNotes] = useState(initial.text)
  const [sources, setSources] = useState(
    variation.fields.sources.length ? variation.fields.sources : [''],
  )
  // Changed elsewhere (an import, RCP-014 10) and not here: shown.
  const now = { notes: variation.fields.notes, sources: variation.fields.sources }
  const [seen, setSeen] = useState(now)
  if (JSON.stringify(now) !== JSON.stringify(seen)) {
    setSeen(now)
    if (now.notes !== seen.notes) {
      const was = editableText(seen.notes ?? '', titlesOf(food))
      if (notes === was.text) {
        const next = editableText(variation.fields.notes ?? '', titlesOf(food))
        for (const [name, id] of next.refs) initial.refs.set(name, id)
        setNotes(next.text)
      }
    }
    const listed = sources.map((x) => x.trim()).filter(Boolean)
    if (
      JSON.stringify(variation.fields.sources) !== JSON.stringify(seen.sources) &&
      JSON.stringify(listed) === JSON.stringify(seen.sources)
    )
      setSources(variation.fields.sources.length ? variation.fields.sources : [''])
  }
  const keepSources = (list: string[]) => {
    const next = list.map((s) => s.trim()).filter(Boolean)
    if (JSON.stringify(next) !== JSON.stringify(variation.fields.sources))
      updateVariation(v, { sources: next })
  }
  const keepNotes = () => {
    const text = storedText(notes, initial.refs).trim()
    if (text !== (variation.fields.notes ?? '')) updateVariation(v, { notes: text || null })
  }
  useOnLeave(() => {
    keepNotes()
    keepSources(sources)
  })
  return (
    <RecipePanel title="Notes and sources">
      <ReferenceField
        label="Notes"
        placeholder="Notes"
        value={notes}
        onChange={setNotes}
        onCommit={keepNotes}
        refs={initial.refs}
        recipes={food.recipes}
        except={recipe.item.id}
      />
      <LinksField label="Source" links={sources} onChange={setSources} onLeave={keepSources} />
    </RecipePanel>
  )
}

/** A Variation's time or servings, kept as it is left. */
function NumberField({
  id,
  label,
  value,
  min,
  max,
  onKeep,
}: {
  id: string
  label: string
  value: number | null
  min: number
  max: number
  onKeep: (value: number | null) => void
}) {
  const [text, setText] = useState(value?.toString() ?? '')
  // Changed elsewhere (an import, RCP-014 10) and not here: shown.
  const [seen, setSeen] = useState(value)
  if (value !== seen) {
    setSeen(value)
    if (text === (seen?.toString() ?? '')) setText(value?.toString() ?? '')
  }
  const keep = () => {
    const read = readWhole(text, min, max)
    if (read === undefined) setText(value?.toString() ?? '')
    else if (read !== value) onKeep(read)
  }
  useOnLeave(keep)
  return (
    <Field label={label} htmlFor={id}>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={keep}
      />
    </Field>
  )
}

/** A whole number typed in a box, or nothing; null when it isn't one in range. */
function readWhole(text: string, min: number, max: number): number | null | undefined {
  if (!text.trim()) return null
  const n = Number(text)
  return Number.isInteger(n) && n >= min && n <= max ? n : undefined
}

/**
 * Editing my Variation (RCP-006 2, RCP-007, RCP-008, RCP-010): its name,
 * state, times and servings, its ingredient lines, method, notes and
 * sources, each kept as it is left. Done goes back to reading it.
 */
export function EditVariation({
  recipe,
  variation,
  food,
  onDone,
}: {
  recipe: RecipeView
  variation: VariationView
  food: FoodData
  onDone: () => void
}) {
  const v = variation.item.id
  const f = variation.fields
  const ids = useId()
  const [name, setName] = useState(variation.item.title)
  const keepName = () => {
    if (!name.trim()) setName(variation.item.title)
    else if (name.trim() !== variation.item.title) updateItem(v, { title: name.trim() })
  }
  useOnLeave(keepName)
  const hasContent =
    variation.lines.some((l) => l.heading === null) || variation.steps.some((s) => s.text.trim())
  // No way back to Idea once it has ingredients or a method (RCP-010 2).
  const states = ['idea', 'active', 'done', 'cancelled'].filter(
    (s) => s !== 'idea' || !hasContent || variation.item.status === 'idea',
  )

  return (
    <div className="flex flex-col gap-5 px-5 pb-12 sm:px-9">
      <VariationFieldsCard>
        <div className="col-span-2 sm:col-span-1">
          <Field label="Variation" htmlFor={`${ids}-name`}>
            <Input
              id={`${ids}-name`}
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={keepName}
            />
          </Field>
        </div>
        <Field label="State">
          <Select
            value={variation.item.status}
            items={states.map((s) => ({ value: s, label: STATE_NAMES[s]! }))}
            onValueChange={(s) => s && s !== variation.item.status && updateItem(v, { status: s })}
          >
            <SelectTrigger aria-label="State" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {states.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATE_NAMES[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {/* A phone: State and Serves, then Prep and Cook (Joe, 20 October). */}
        <NumberField
          id={`${ids}-servings`}
          label="Serves"
          value={f.servings}
          min={1}
          max={100}
          onKeep={(n) => updateVariation(v, { servings: n })}
        />
        <NumberField
          id={`${ids}-prep`}
          label="Prep (min)"
          value={f.prep_min}
          min={0}
          max={10000}
          onKeep={(n) => updateVariation(v, { prep_min: n })}
        />
        <NumberField
          id={`${ids}-cook`}
          label="Cook (min)"
          value={f.cook_min}
          min={0}
          max={10000}
          onKeep={(n) => updateVariation(v, { cook_min: n })}
        />
        <Button className="max-sm:hidden" onClick={onDone}>
          Done
        </Button>
      </VariationFieldsCard>
      <RecipeColumns layout="editing">
        <Ingredients variation={variation} pantry={food.pantry} />
        <Method variation={variation} food={food} recipe={recipe} />
      </RecipeColumns>
      <NotesAndSources variation={variation} food={food} recipe={recipe} />
      {/* On a phone Done is where the editing ends. */}
      <Button className="sm:hidden" onClick={onDone}>
        Done
      </Button>
    </div>
  )
}
