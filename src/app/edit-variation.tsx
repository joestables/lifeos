import { PlusIcon, SparklesIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import {
  RecipeColumns,
  RecipePanel,
  STEP_FIELD,
  StepEditor,
  SubheadingEditor,
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
} from '@/data'
import type { RecipeView, VariationView } from '@/data/food-hooks'
import { useOnLeave } from '@/hooks/use-on-leave'
import { useReorder } from '@/hooks/use-reorder'
import { STATE_NAMES, byPosition, editableText, storedText } from '@/lib/recipe-parts'
import { IngredientRow } from './ingredient-row'
import { AI_REFUSALS } from './ai-words'
import { ImportDialog } from './import-dialog'
import {
  clearBackgroundImport,
  continueImport,
  keepImportInto,
  linesFrom,
  replaceLines,
  useBackgroundImport,
} from './variation-ai'
import { LinksField } from './links-field'
import { titlesOf } from './recipe-helpers'
import { Field } from './task-details'
import { ReferenceField } from './reference-field'

/** A row of the ingredients being edited: a line or a subheading, kept or not yet. */
interface Row {
  id: string
  position: string
  heading: boolean
  /** Kept: on the server or queued. */
  line?: Line
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
  // An import going on with its Dialog closed (Joe, 23 October).
  const background = useBackgroundImport(variation)
  const busy = filler.filling || background?.state === 'working'
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
        <Button variant="ghost" size="sm" disabled={filler.empty || busy} onClick={filler.start}>
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
      <div className="flex flex-col gap-2" aria-busy={busy || undefined}>
        {busy && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}
        {!busy &&
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
                id={r.id}
                position={r.position}
                line={r.line}
                pantry={pantry}
                onAdd={(fields, id) => addLine(v, fields, id)}
                onUpdate={(fields) => updateLine(v, r.id, fields)}
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
  const background = useBackgroundImport(variation)
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
          <Button
            variant="ghost"
            size="sm"
            disabled={background !== undefined}
            onClick={() => setImporting(true)}
          >
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
          onContinue={(work, link) => {
            setDrafts({})
            setFresh([])
            continueImport(v, work, link)
          }}
          onChecked={({ recipe: imported, link }) => {
            setImporting(false)
            setDrafts({})
            setFresh([])
            keepImportInto(v, imported, link)
          }}
        />
      )}
      {background?.state === 'choose' && (
        <ImportDialog
          food={food}
          into={{ replacing: true }}
          choice={background}
          onClose={() => clearBackgroundImport(v)}
          onChecked={({ recipe: imported, link }) => {
            clearBackgroundImport(v)
            keepImportInto(v, imported, link)
          }}
        />
      )}
      <div
        className="flex flex-col gap-2.5"
        aria-busy={background?.state === 'working' || undefined}
      >
        {background?.state === 'working' &&
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
        {background?.state !== 'working' &&
          rows.map((r, i) => (
            <StepEditor
              key={r.id}
              n={i + 1}
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
