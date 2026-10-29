import type { ImportedRecipe } from '@lifeos/food'
import { useBlocker, useNavigate } from '@tanstack/react-router'
import { ChevronDownIcon, PlusIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import {
  IngredientLineEditor,
  LabelPicker,
  LINE_UNITS,
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
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/sonner'
import { Textarea } from '@/components/ui/textarea'
import {
  keepImport,
  newId,
  positionsFor,
  updateItem,
  usePhotoUrls,
  type FoodData,
  type KeptImport,
  type ValueKind,
} from '@/data'
import { resizePhoto } from '@/lib/photo-resize'
import { type Aisle } from '@/lib/pantry'
import { amountText, readAmount } from '@/lib/recipe-parts'
import { nameTaken, takenMessage, valueChoices } from '@/lib/recipes'
import { AddToPantryDialog } from './add-to-pantry'
import { focusStep } from './focus-step'
import { keepPhoto, type PhotoChoice } from './keep-photo'
import { setPendingImport, type PendingImport } from './import-store'
import { PhotoField } from './photo-field'
import { Field } from './task-details'

type LineUnit = (typeof LINE_UNITS)[number]

type Row =
  | { key: string; kind: 'heading'; text: string }
  | {
      key: string
      kind: 'line'
      name: string
      pantryId: string | null
      aisle: string
      defaultUnit: string | null
      /** To be added to the Pantry when kept, chosen from its mark. */
      add: boolean
      amount: string
      unit: LineUnit
    }

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** The lines as rows to check, a subheading wherever the source's group changes. */
function rowsOf(recipe: ImportedRecipe): Row[] {
  const rows: Row[] = []
  let group: string | null = null
  for (const l of recipe.lines) {
    if (l.group && l.group !== group) rows.push({ key: newId(), kind: 'heading', text: l.group })
    group = l.group
    rows.push({
      key: newId(),
      kind: 'line',
      name: l.name,
      pantryId: l.pantryId,
      aisle: l.aisle ?? 'cupboard',
      defaultUnit: l.defaultUnit,
      add: false,
      amount: amountText({ qty: l.qty, qty_max: l.qtyMax, approx: l.approx }),
      unit: l.unit ?? '',
    })
  }
  return rows
}

/** A whole number typed, or nothing. */
const whole = (text: string) => {
  const n = Number(text)
  return text.trim() && Number.isInteger(n) && n > 0 ? n : null
}

/**
 * Check the import (RCP-014 1, 3, 8; patterns.md#recipes): what the AI
 * wrote, laid out as editing a Variation under its heading's fields, to
 * change before Keep saves it all. Names new to my lists and entries new to
 * the Pantry say so. Cancel, or leaving, asks first and keeps nothing.
 */
export function CheckImport({ pending, food }: { pending: PendingImport; food: FoodData }) {
  const navigate = useNavigate()
  const ids = useId()
  const r = pending.recipe
  const idea = pending.idea ? food.byId.get(pending.idea) : undefined
  const [name, setName] = useState(idea?.item.title ?? r.name)
  const [heading, setHeading] = useState({
    category: r.category,
    cuisine: r.cuisine,
    protein: r.protein,
    carbs: r.carbs,
  })
  const [servings, setServings] = useState(r.servings?.toString() ?? '')
  const [prep, setPrep] = useState(r.prepMin?.toString() ?? '')
  const [cook, setCook] = useState(r.cookMin?.toString() ?? '')
  const [rows, setRows] = useState(() => rowsOf(r))
  const [steps, setSteps] = useState(() => r.steps.map((text) => ({ key: newId(), text })))
  const [notes, setNotes] = useState(r.notes)
  const [photo, setPhoto] = useState<PhotoChoice>(null)
  const current = usePhotoUrls([idea?.photo?.path]).get(idea?.photo?.path ?? '')
  const [tried, setTried] = useState(false)
  const [keeping, setKeeping] = useState(false)
  // Kept: leaving no longer asks (a ref, read as the navigation starts).
  const done = useRef(false)

  // The page's picture, made small on the device as any photo is.
  useEffect(() => {
    if (!pending.photo || idea?.photo) return
    let live = true
    void fetch(pending.photo)
      .then((res) => res.blob())
      .then(resizePhoto)
      .then((made) => live && setPhoto({ ...made, url: URL.createObjectURL(made.blob) }))
      .catch(() => {})
    return () => void (live = false)
  }, [pending.photo, idea?.photo])

  const blocker = useBlocker({ shouldBlockFn: () => !done.current, withResolver: true })

  const taken = name.trim() ? nameTaken(food.recipes, name, idea?.item.id) : undefined
  const problem = !name.trim() ? 'A recipe needs a name' : taken ? takenMessage(taken) : null
  const missing = [
    !heading.category.trim() && 'category',
    !heading.cuisine.trim() && 'cuisine',
  ].filter(Boolean)
  const factsProblem = missing.length ? `A draft needs a ${missing.join(' and a ')}` : null

  const choices = (kind: ValueKind) => valueChoices(food.values, food.recipes, kind)
  // New to me: on none of the lists I choose from (RCP-014 8).
  const isNew = (kind: ValueKind, value: string) => !choices(kind).some((c) => same(c, value))

  const setRow = (key: string, patch: Partial<Extract<Row, { kind: 'line' }>>) =>
    setRows((rs) =>
      rs.map((row) => (row.key === key && row.kind === 'line' ? { ...row, ...patch } : row)),
    )
  /** A name changed: the Pantry entry of that name, else a new one. */
  const rename = (key: string, text: string) => {
    const found = [...food.pantry.values()].find(
      (p) => p.kind === 'ingredient' && same(p.name, text),
    )
    setRow(key, { name: text, pantryId: found?.id ?? null, add: false })
  }
  const [adding, setAdding] = useState<Extract<Row, { kind: 'line' }> | null>(null)
  // A step made by Enter takes the caret.
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const addStepAfter = (i: number) => {
    const key = newId()
    setSteps((ss) => [...ss.slice(0, i + 1), { key, text: '' }, ...ss.slice(i + 1)])
    setFocusKey(key)
  }
  const addLineRow = () => {
    const key = newId()
    setRows((rs) => [
      ...rs,
      {
        key,
        kind: 'line',
        name: '',
        pantryId: null,
        aisle: 'cupboard',
        defaultUnit: null,
        add: false,
        amount: '',
        unit: '',
      },
    ])
    setFocusKey(key)
  }

  const keep = async () => {
    setTried(true)
    if (problem || factsProblem) return
    const lines = rows.filter((row) => row.kind === 'heading' || row.name.trim())
    const linePositions = positionsFor(lines.length)
    const kept = steps.filter((s) => s.text.trim())
    const stepPositions = positionsFor(kept.length)
    const draft: KeptImport = {
      name: name.trim(),
      category: heading.category.trim(),
      cuisine: heading.cuisine.trim(),
      protein: heading.protein,
      carbs: heading.carbs,
      servings: whole(servings),
      prep_min: whole(prep),
      cook_min: whole(cook),
      notes: notes.trim(),
      sources: [pending.link],
      steps: kept.map((s, i) => ({ position: stepPositions[i]!, text: s.text.trim() })),
      lines: lines.map((row, i) => {
        const position = linePositions[i]!
        if (row.kind === 'heading') return { position, heading: row.text.trim() || 'For the rest' }
        const read = readAmount(row.amount) ?? { qty: null, qty_max: null, approx: false }
        const unit = row.unit || read.unit || null
        return {
          position,
          // Not in the Pantry and not added from its mark: kept as typed
          // (Joe, 24 October), to add later as any typed line is.
          ...(row.pantryId
            ? { pantry_id: row.pantryId }
            : row.add
              ? {
                  new_pantry: {
                    id: newId(),
                    name: row.name.trim(),
                    aisle: row.aisle,
                    default_unit: row.defaultUnit,
                  },
                }
              : { text: row.name.trim() }),
          qty: read.qty,
          qty_max: read.qty_max,
          approx: read.approx,
          unit,
        }
      }),
    }
    const recipe = idea?.item.id ?? newId()
    const variation = idea?.defaultVariation?.item.id ?? newId()
    setKeeping(true)
    try {
      await keepImport(recipe, variation, draft)
    } catch {
      setKeeping(false)
      toast('Couldn’t keep it. It needs a connection; try again')
      return
    }
    if (idea && name.trim() !== idea.item.title) updateItem(recipe, { title: name.trim() })
    keepPhoto(recipe, photo, idea?.photo)
    done.current = true
    // Cleared once gone, or this page would first go back to Recipes.
    void navigate({ to: '/recipes/$id', params: { id: recipe }, replace: true }).then(() =>
      setPendingImport(null),
    )
  }

  const single = (kind: 'category' | 'cuisine', label: string, names: string) => {
    const value = heading[kind]
    return (
      <Field label={label}>
        <LabelPicker
          name={label}
          names={names}
          trigger={
            <Button
              variant="outline"
              aria-label={label}
              className="w-full justify-between font-normal"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span className={value ? 'truncate' : 'truncate text-muted-foreground'}>
                  {value || 'None'}
                </span>
                {value && isNew(kind, value) && <Badge variant="outline">New</Badge>}
              </span>
              <ChevronDownIcon className="text-muted-foreground" />
            </Button>
          }
          labels={[...new Set([...choices(kind), ...(value ? [value] : [])])].map((o) => ({
            id: o,
            name: o,
          }))}
          chosen={new Set(value ? [value] : [])}
          onToggle={(v, on) => setHeading((h) => ({ ...h, [kind]: on ? v : '' }))}
          onCreate={(v) => setHeading((h) => ({ ...h, [kind]: v }))}
        />
      </Field>
    )
  }

  const many = (field: 'protein' | 'carbs', kind: ValueKind, label: string, one: string) => {
    const chosen = heading[field]
    const set = (next: string[]) => setHeading((h) => ({ ...h, [field]: next }))
    return (
      <Field label={label}>
        <div className="flex flex-wrap items-center gap-1.5">
          {chosen.map((v) => (
            <Badge
              key={v}
              removeLabel={`Remove ${v}`}
              onRemove={() => set(chosen.filter((c) => c !== v))}
            >
              {v}
              {isNew(kind, v) && ' · New'}
            </Badge>
          ))}
          <LabelPicker
            name={one}
            names={label}
            trigger={
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                Add
              </Button>
            }
            labels={choices(kind).map((o) => ({ id: o, name: o }))}
            chosen={new Set(chosen)}
            onToggle={(v, on) => set(on ? [...chosen, v] : chosen.filter((c) => !same(c, v)))}
            onCreate={(v) => set([...chosen, v])}
          />
        </div>
      </Field>
    )
  }

  const actions = (className: string) => (
    <div className={className}>
      <Button
        variant="outline"
        onClick={() => void navigate({ to: '/recipes' })}
        disabled={keeping}
      >
        Cancel
      </Button>
      <Button onClick={() => void keep()} disabled={keeping}>
        Keep
      </Button>
    </div>
  )

  return (
    <div className="flex flex-col gap-5 px-5 pb-12 sm:px-9">
      {actions('flex justify-end gap-2 max-sm:hidden')}
      <Card className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <div className="shrink-0">
          <PhotoField current={current} choice={photo} onChoice={setPhoto} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Field label="Name" htmlFor={`${ids}-name`}>
            <Input
              id={`${ids}-name`}
              autoComplete="off"
              value={name}
              aria-invalid={(tried && problem !== null) || undefined}
              onChange={(e) => setName(e.target.value)}
            />
            {tried && problem && <p className="text-sm text-destructive">{problem}</p>}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            {single('category', 'Category', 'Categories')}
            {single('cuisine', 'Cuisine', 'Cuisines')}
          </div>
          {tried && factsProblem && (
            <p className="-mt-2 text-sm text-destructive">{factsProblem}</p>
          )}
          {many('protein', 'protein', 'Protein', 'Protein')}
          {many('carbs', 'carb', 'Carbs', 'Carb')}
        </div>
      </Card>
      <VariationFieldsCard>
        {(
          [
            ['servings', 'Serves', servings, setServings],
            ['prep', 'Prep (min)', prep, setPrep],
            ['cook', 'Cook (min)', cook, setCook],
          ] as const
        ).map(([id, label, value, set]) => (
          <Field key={id} label={label} htmlFor={`${ids}-${id}`}>
            <Input
              id={`${ids}-${id}`}
              inputMode="numeric"
              autoComplete="off"
              value={value}
              onChange={(e) => set(e.target.value)}
            />
          </Field>
        ))}
      </VariationFieldsCard>
      <RecipeColumns layout="editing">
        <RecipePanel title="Ingredients">
          {adding && (
            <AddToPantryDialog
              name={adding.name.trim()}
              unit={adding.defaultUnit ?? (adding.unit || null)}
              aisle={adding.aisle as Aisle}
              pantry={food.pantry}
              onAdd={(n, aisle, defaultUnit) =>
                setRow(adding.key, { name: n, aisle, defaultUnit, add: true })
              }
              onClose={() => setAdding(null)}
            />
          )}
          <div className="flex flex-col gap-2">
            {rows.map((row) =>
              row.kind === 'heading' ? (
                <SubheadingEditor
                  key={row.key}
                  value={row.text}
                  onChange={(text) =>
                    setRows((rs) => rs.map((x) => (x.key === row.key ? { ...row, text } : x)))
                  }
                  onRemove={() => setRows((rs) => rs.filter((x) => x.key !== row.key))}
                />
              ) : (
                <IngredientLineEditor
                  key={row.key}
                  ingredient={row.name}
                  status={row.pantryId || row.add ? 'pantry' : 'typed'}
                  onAddToPantry={row.name.trim() ? () => setAdding(row) : undefined}
                  ingredientField={
                    <Input
                      aria-label="Ingredient"
                      autoComplete="off"
                      autoFocus={focusKey === row.key}
                      value={row.name}
                      onChange={(e) => rename(row.key, e.target.value)}
                      className="pr-9"
                    />
                  }
                  amount={row.amount}
                  unit={row.unit}
                  onAmount={(amount) => setRow(row.key, { amount })}
                  onUnit={(unit) => setRow(row.key, { unit })}
                  onRemove={() => setRows((rs) => rs.filter((x) => x.key !== row.key))}
                />
              ),
            )}
            <Button
              variant="ghost"
              size="sm"
              className="self-start text-muted-foreground"
              onClick={addLineRow}
            >
              <PlusIcon /> Add an ingredient
            </Button>
          </div>
        </RecipePanel>
        <RecipePanel title="Method">
          <div className="flex flex-col gap-2.5">
            {steps.map((s, i) => (
              <StepEditor
                key={s.key}
                n={i + 1}
                field={
                  <Textarea
                    aria-label={`Step ${i + 1}`}
                    className={STEP_FIELD}
                    autoFocus={focusKey === s.key}
                    value={s.text}
                    onChange={(e) =>
                      setSteps((ss) =>
                        ss.map((x) => (x.key === s.key ? { ...x, text: e.target.value } : x)),
                      )
                    }
                    onKeyDown={(e) => {
                      // As editing a Variation: Enter starts the next step,
                      // Backspace in an empty one removes it (Joe, 24 October).
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        addStepAfter(i)
                      } else if (e.key === 'Backspace' && s.text === '') {
                        e.preventDefault()
                        setSteps((ss) => ss.filter((x) => x.key !== s.key))
                        if (i > 0) focusStep(i)
                      }
                    }}
                  />
                }
                onRemove={() => setSteps((ss) => ss.filter((x) => x.key !== s.key))}
              />
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="self-start text-muted-foreground"
              onClick={() => addStepAfter(steps.length - 1)}
            >
              <PlusIcon /> Add a step
            </Button>
          </div>
        </RecipePanel>
      </RecipeColumns>
      <RecipePanel title="Notes">
        <Textarea aria-label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <p className="text-sm text-muted-foreground">From {pending.link}</p>
      </RecipePanel>
      {actions('flex justify-end gap-2 sm:hidden')}
      <AlertDialog
        open={blocker.status === 'blocked'}
        onOpenChange={(o) => !o && blocker.reset?.()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without keeping it?</AlertDialogTitle>
            <AlertDialogDescription>Nothing of this import is kept</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setPendingImport(null)
                blocker.proceed?.()
              }}
            >
              Leave
            </AlertDialogAction>
            <AlertDialogCancel />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
