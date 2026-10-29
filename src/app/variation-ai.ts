import type { ImportAnswer, ImportedLine, ImportedRecipe } from '@lifeos/food'
import { useSyncExternalStore } from 'react'
import { toast } from '@/components/ui/sonner'
import {
  addLine,
  addStep,
  positionsFor,
  removeLine,
  removeStep,
  updateVariation,
  type LineFields,
} from '@/data'
import type { VariationView } from '@/data/food-hooks'
import { AI_REFUSALS } from './ai-words'

/** A line's fields, to make again. */
const fieldsOf = (l: VariationView['lines'][number]): LineFields => ({
  position: l.position,
  heading: l.heading,
  pantry_id: l.pantry_id,
  text: l.text,
  qty: l.qty,
  qty_max: l.qty_max,
  approx: l.approx,
  unit: l.unit,
})

/**
 * The lines the AI read, as a Variation's lines: a subheading wherever the
 * source's group changes; a line matching no Pantry entry kept as typed
 * (RCP-014 11), to add to the Pantry as any typed line is.
 */
export function linesFrom(lines: readonly ImportedLine[]): LineFields[] {
  const out: LineFields[] = []
  let group: string | null = null
  for (const l of lines) {
    if (l.group && l.group !== group) out.push({ heading: l.group })
    group = l.group
    out.push({
      ...(l.pantryId ? { pantry_id: l.pantryId } : { text: l.name }),
      qty: l.qty,
      qty_max: l.qtyMax,
      approx: l.approx,
      unit: l.unit,
    })
  }
  const positions = positionsFor(out.length)
  return out.map((f, i) => ({ ...f, position: positions[i]! }))
}

/** Replaces a Variation's lines (RCP-007 5): what puts them back. */
export function replaceLines(variation: VariationView, lines: readonly LineFields[]): () => void {
  const v = variation.item.id
  const old = variation.lines.map(fieldsOf)
  for (const l of variation.lines) removeLine(v, l.id)
  const made = lines.map((f) => addLine(v, f))
  return () => {
    for (const id of made) removeLine(v, id)
    for (const f of old) addLine(v, f)
  }
}

/** Replaces a Variation's steps: what puts them back. */
function replaceSteps(variation: VariationView, steps: readonly string[]): () => void {
  const v = variation.item.id
  const old = variation.steps.map((s) => ({ text: s.text, position: s.position }))
  for (const s of variation.steps) removeStep(v, s.id)
  const positions = positionsFor(steps.length)
  const made = steps.map((text, i) => addStep(v, text, positions[i]!))
  return () => {
    for (const id of made) removeStep(v, id)
    for (const s of old) addStep(v, s.text, s.position)
  }
}

/**
 * Import from a link into a Draft Variation (RCP-014 10): its ingredients
 * and method replaced by the page's; its servings, times and notes filled
 * where empty; the link added to its sources. The Recipe's heading is not
 * touched. Returns what puts it all back.
 */
export function importInto(
  variation: VariationView,
  recipe: ImportedRecipe,
  link: string,
): () => void {
  const f = variation.fields
  const undoLines = replaceLines(variation, linesFrom(recipe.lines))
  const undoSteps = replaceSteps(variation, recipe.steps)
  const was = {
    servings: f.servings,
    prep_min: f.prep_min,
    cook_min: f.cook_min,
    notes: f.notes,
    sources: f.sources,
  }
  const filled = {
    servings: f.servings ?? recipe.servings,
    prep_min: f.prep_min ?? recipe.prepMin,
    cook_min: f.cook_min ?? recipe.cookMin,
    notes: f.notes || recipe.notes || null,
    sources: f.sources.includes(link) ? f.sources : [...f.sources, link],
  }
  updateVariation(variation.item.id, filled)
  return () => {
    undoLines()
    undoSteps()
    updateVariation(variation.item.id, was)
  }
}

/**
 * An import into a Draft that goes on after its Dialog is closed (Joe, 23
 * October): working, then applied with Undo, or a page of several waiting
 * for a choice. Kept in memory, by Variation.
 */
export type BackgroundImport =
  | { state: 'working'; link: string }
  | { state: 'choose'; link: string; answer: Extract<ImportAnswer, { ok: true }> }

const background = new Map<string, BackgroundImport>()
/** Each Variation as last shown, for an import that ends after its page is left. */
const latest = new Map<string, VariationView>()
const listeners = new Set<() => void>()
const changed = () => listeners.forEach((l) => l())

function setBackground(v: string, next: BackgroundImport | null) {
  if (next) background.set(v, next)
  else background.delete(v)
  changed()
}

export function useBackgroundImport(variation: VariationView): BackgroundImport | undefined {
  latest.set(variation.item.id, variation)
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => background.get(variation.item.id),
  )
}

export function clearBackgroundImport(v: string) {
  setBackground(v, null)
}

/** The import kept in a Draft, with Undo (RCP-014 10). */
export function keepImportInto(v: string, recipe: ImportedRecipe, link: string) {
  const variation = latest.get(v)
  if (!variation) return
  const undo = importInto(variation, recipe, link)
  toast('Imported the ingredients and method', { action: { label: 'Undo', onClick: undo } })
}

/** The Dialog closed while it worked: the answer is kept when it comes. */
export function continueImport(v: string, work: Promise<ImportAnswer>, link: string) {
  setBackground(v, { state: 'working', link })
  void work.then((answer) => {
    if (!answer.ok) {
      setBackground(v, null)
      toast(AI_REFUSALS[answer.reason])
    } else if (answer.recipes.length === 1) {
      setBackground(v, null)
      keepImportInto(v, answer.recipes[0]!, link)
    } else setBackground(v, { state: 'choose', link, answer })
  })
}
