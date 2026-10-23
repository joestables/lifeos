import type { ImportedLine, ImportedRecipe } from '@lifeos/food'
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
