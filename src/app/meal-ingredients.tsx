import type { ImportedLine } from '@lifeos/food'
import { ExternalLinkIcon, LoaderCircleIcon, PlusIcon, SparklesIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { SectionLabel } from '@/components/lifeos'
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
import { toast } from '@/components/ui/sonner'
import {
  addMealLine,
  linkPicture,
  mealIngredients,
  newId,
  positionBetween,
  positionsFor,
  removeMealLine,
  updateMeal,
  updateMealLine,
  type MealLineFields,
  type PantryEntry,
} from '@/data'
import type { PlannedMeal } from '@/lib/meals'
import { resizePhoto } from '@/lib/photo-resize'
import { AI_REFUSALS } from './ai-words'
import { keepPhoto } from './keep-photo'
import { IngredientRow } from './ingredient-row'

/** The lines the AI read, as a Meal's: no subheadings; unmatched kept as typed. */
function mealLinesFrom(lines: readonly ImportedLine[]): MealLineFields[] {
  const positions = positionsFor(lines.length)
  return lines.map((l, i) => ({
    position: positions[i]!,
    ...(l.pantryId ? { pantry_id: l.pantryId } : { text: l.name }),
    qty: l.qty,
    qty_max: l.qtyMax,
    approx: l.approx,
    unit: l.unit,
  }))
}

/** A Meal's lines replaced (MPL-006 2): what puts them back. */
function replaceMealLines(meal: PlannedMeal, lines: readonly MealLineFields[]): () => void {
  const old = (meal.lines ?? []).map((l) => ({
    position: l.position,
    pantry_id: l.pantry_id,
    text: l.text,
    qty: l.qty,
    qty_max: l.qty_max,
    approx: l.approx,
    unit: l.unit,
  }))
  for (const l of meal.lines ?? []) removeMealLine(meal.id, l.id)
  const made = lines.map((f) => addMealLine(meal.id, f))
  return () => {
    for (const id of made) removeMealLine(meal.id, id)
    for (const f of old) addMealLine(meal.id, f)
  }
}

/**
 * A typed Meal's picture from its link (MPL-006 6), when it has none:
 * fetched by link-preview, made small on the device as any photo is.
 * Quietly nothing when the page has none.
 */
async function pictureFromLink(meal: PlannedMeal, link: string) {
  const data = await linkPicture(link)
  if (!data) return
  try {
    const made = await resizePhoto(await (await fetch(data)).blob())
    keepPhoto(meal.id, { ...made, url: '' }, undefined)
  } catch {
    // A picture the browser can't read: the Meal goes without.
  }
}

const isLink = (text: string) => {
  try {
    return /^https?:$/.test(new URL(text.trim()).protocol)
  } catch {
    return false
  }
}

/**
 * A Meal's own ingredients (MPL-006, patterns.md#meal-plan): on a typed
 * Meal a link to read them from, Get ingredients asking first over lines
 * there are, with Undo; then its lines, as a Variation's but with no
 * subheadings, and Add an ingredient. "Extra ingredients" on a Recipe's
 * Meal, beside the Recipe's.
 */
export function MealIngredients({
  meal,
  pantry,
}: {
  meal: PlannedMeal
  pantry: ReadonlyMap<string, PantryEntry>
}) {
  const ids = useId()
  const typed = !meal.variation
  const lines = meal.lines ?? []
  const [fresh, setFresh] = useState<{ id: string; position: string }[]>([])
  const [focus, setFocus] = useState<string | null>(null)
  const [link, setLink] = useState(meal.source ?? '')
  const [getting, setGetting] = useState(false)
  const [asking, setAsking] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const kept = new Set(lines.map((l) => l.id))
  const rows = [
    ...lines.map((l) => ({ id: l.id, position: l.position, line: l })),
    ...fresh.filter((r) => !kept.has(r.id)).map((r) => ({ ...r, line: undefined })),
  ].sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0))

  const keepLink = () => {
    const next = link.trim()
    if (next && !isLink(next)) return
    if (next === (meal.source ?? '')) return
    updateMeal(meal.id, { source: next || null })
    if (next && !meal.photo) void pictureFromLink(meal, next)
  }

  const get = async () => {
    setAsking(false)
    setProblem(null)
    keepLink()
    setGetting(true)
    const answer = await mealIngredients(link.trim())
    setGetting(false)
    if (!answer.ok) {
      setProblem(AI_REFUSALS[answer.reason])
      return
    }
    const wasServings = meal.servings
    const undoLines = replaceMealLines(meal, mealLinesFrom(answer.lines))
    if (answer.servings && answer.servings !== meal.servings)
      updateMeal(meal.id, { servings: answer.servings })
    toast('Got the ingredients', {
      action: {
        label: 'Undo',
        onClick: () => {
          undoLines()
          if (answer.servings && answer.servings !== wasServings)
            updateMeal(meal.id, { servings: wasServings })
        },
      },
    })
  }

  const add = () => {
    const id = newId()
    setFresh((f) => [...f, { id, position: positionBetween(rows.at(-1)?.position ?? null, null) }])
    setFocus(id)
  }

  return (
    <section aria-labelledby={`${ids}-title`} className="flex flex-col gap-2">
      <SectionLabel id={`${ids}-title`} className="mb-0">
        {typed ? 'Ingredients' : 'Extra ingredients'}
      </SectionLabel>
      {typed && (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="min-w-0 flex-1 basis-56"
              aria-label="Link"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="A recipe’s link"
              value={link}
              onChange={(e) => {
                setLink(e.target.value)
                setProblem(null)
              }}
              onBlur={keepLink}
            />
            {meal.source && meal.source === link.trim() && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open the link"
                render={<a href={meal.source} target="_blank" rel="noreferrer" />}
              >
                <ExternalLinkIcon />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={!isLink(link) || getting}
              onClick={() => (lines.length ? setAsking(true) : void get())}
            >
              {getting ? <LoaderCircleIcon className="animate-spin" /> : <SparklesIcon />}
              Get ingredients
            </Button>
          </div>
          {problem && <p className="text-sm text-destructive">{problem}</p>}
        </div>
      )}
      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <IngredientRow
            key={r.id}
            id={r.id}
            position={r.position}
            line={r.line}
            pantry={pantry}
            autoFocus={focus === r.id}
            onAdd={(fields, id) => addMealLine(meal.id, fields, id)}
            onUpdate={(fields) => updateMealLine(meal.id, r.id, fields)}
            onRemove={() => {
              if (kept.has(r.id)) removeMealLine(meal.id, r.id)
              setFresh((f) => f.filter((x) => x.id !== r.id))
            }}
          />
        ))}
      </div>
      <Button variant="ghost" size="sm" className="self-start text-muted-foreground" onClick={add}>
        <PlusIcon /> Add an ingredient
      </Button>
      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace the ingredients?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => void get()}>Replace</AlertDialogAction>
            <AlertDialogCancel />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
