/**
 * What the model must answer for a recipe (ADR-0054), and the check that it
 * did. From v1's schema, with its lesson kept: **every property is required,
 * the optional ones nullable**, since Gemini drops a property that isn't
 * required on some calls, in a way no test catches.
 *
 * The check is structural, never a judgement on the recipe: I review every
 * line before keeping it. Sloppy fields are made emptier, never made up.
 */
import {
  AISLES,
  type Aisle,
  type ImportedLine,
  type ImportedRecipe,
} from '../../../packages/food/src/imported.ts'
import { isUnit, type Unit } from '../../../packages/food/src/units.ts'

const UNIT_ENUM = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', null]
const nullable = (type: string) => ({ type: [type, 'null'] })

const INGREDIENT = {
  type: 'object',
  additionalProperties: false,
  required: [
    'outcome',
    'pantryRef',
    'name',
    'aisle',
    'defaultUnit',
    'group',
    'amount',
    'amountUpper',
    'unit',
    'isApproximate',
    'sourceLine',
  ],
  properties: {
    outcome: { type: 'string', enum: ['matched', 'new', 'omitted'] },
    pantryRef: {
      ...nullable('string'),
      description: 'outcome=matched: the Pantry reference (P1, P2…), COPIED EXACTLY.',
    },
    name: {
      ...nullable('string'),
      description:
        'matched: the entry as listed. new: British English, Title Case, singular where countable, no preparation or packaging.',
    },
    aisle: {
      type: ['string', 'null'],
      enum: [...AISLES, null],
      description: 'Non-null whenever outcome=new: the aisle it is bought from.',
    },
    defaultUnit: { type: ['string', 'null'], enum: UNIT_ENUM },
    group: {
      ...nullable('string'),
      description: 'The source’s heading over this line ("For the sauce"), or null.',
    },
    amount: {
      ...nullable('string'),
      description: 'Decimal string, already metric and rounded: "400", "0.5". Never a fraction.',
    },
    amountUpper: {
      ...nullable('string'),
      description: 'The top of a range: "1-2 tsp" gives amount "1", amountUpper "2".',
    },
    unit: {
      type: ['string', 'null'],
      enum: UNIT_ENUM,
      description: 'Null for a countable line ("2 onions"). Never imperial.',
    },
    isApproximate: { type: 'boolean' },
    sourceLine: { type: 'string', description: 'The original line, verbatim.' },
  },
}

export const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['isRecipe', 'recipes'],
  properties: {
    isRecipe: {
      type: 'boolean',
      description: 'False when the source is not a recipe at all; then recipes is empty.',
    },
    recipes: {
      type: 'array',
      description: 'One entry per distinct recipe. Never merge two, never pick one.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'name',
          'ingredients',
          'method',
          'notes',
          'prepTimeMinutes',
          'cookTimeMinutes',
          'servings',
          'categoryName',
          'cuisineName',
          'proteinNames',
          'carbNames',
        ],
        properties: {
          name: { type: 'string' },
          ingredients: { type: 'array', items: INGREDIENT },
          method: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string', description: 'Empty string if none.' },
          prepTimeMinutes: nullable('integer'),
          cookTimeMinutes: nullable('integer'),
          servings: nullable('integer'),
          categoryName: { type: 'string', description: 'Always set; never empty.' },
          cuisineName: { type: 'string', description: 'Always set; never empty.' },
          proteinNames: { type: 'array', items: { type: 'string' } },
          carbNames: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
}

/** Fill from method's answer: the lines only. */
export const LINES_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['ingredients'],
  properties: { ingredients: { type: 'array', items: INGREDIENT } },
}

export class ValidationError extends Error {}

export interface PantryEntry {
  id: string
  name: string
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const names = (v: unknown): string[] =>
  (Array.isArray(v) ? v : []).map(str).filter((s): s is string => s !== null)
const int = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && Math.round(v) > 0 ? Math.round(v) : null
const unit = (v: unknown): Unit | null => {
  const s = str(v)?.toLowerCase()
  return s && isUnit(s) ? s : null
}
const aisle = (v: unknown): Aisle | null => {
  const s = str(v)
    ?.toLowerCase()
    .replace(/[^a-z]+/g, '_')
  return (AISLES as readonly string[]).includes(s ?? '') ? (s as Aisle) : null
}
/** "1.5", "1,5", "½" → a number; anything else, nothing. */
const amount = (v: unknown): number | null => {
  const s = str(v)?.replace(',', '.').replace('½', '.5').replace('¼', '.25').replace('¾', '.75')
  if (!s) return null
  const n = Number(s.startsWith('.') ? `0${s}` : s)
  return Number.isFinite(n) && n > 0 ? n : null
}
const key = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase()

/**
 * The model's JSON as recipes, each line's Pantry reference checked against
 * the Pantry it was given: a reference that isn't one is looked up by name,
 * and failing that the line becomes a new entry. A new entry named as one
 * already there is that one. An omitted line, or one with no name, leaves
 * the list (its words are in the method).
 */
export function parseRecipes(text: string, pantry: readonly PantryEntry[]): ImportedRecipe[] {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new ValidationError('The AI answered something that wasn’t JSON')
  }
  if (!raw || typeof raw !== 'object') throw new ValidationError('The AI’s answer wasn’t an object')
  const obj = raw as Record<string, unknown>
  if (!Array.isArray(obj.recipes)) throw new ValidationError('The AI’s answer had no recipes')
  if (obj.isRecipe === false) return []

  const byName = new Map(pantry.map((p) => [key(p.name), p]))
  return obj.recipes
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
    .map((r) => parseRecipe(r, pantry, byName))
    .filter((r) => r.name && (r.lines.length > 0 || r.steps.length > 0))
}

/** Fill from method's JSON as lines, checked against the Pantry as an import's are. */
export function parseLines(text: string, pantry: readonly PantryEntry[]): ImportedLine[] {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new ValidationError('The AI answered something that wasn’t JSON')
  }
  const ingredients = (raw as { ingredients?: unknown } | null)?.ingredients
  if (!Array.isArray(ingredients)) throw new ValidationError('The AI’s answer had no ingredients')
  const byName = new Map(pantry.map((p) => [key(p.name), p]))
  return ingredients
    .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object')
    .map((i) => parseLine(i, pantry, byName))
    .filter((l): l is ImportedLine => l !== null)
}

function parseRecipe(
  r: Record<string, unknown>,
  pantry: readonly PantryEntry[],
  byName: ReadonlyMap<string, PantryEntry>,
): ImportedRecipe {
  const lines = (Array.isArray(r.ingredients) ? r.ingredients : [])
    .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object')
    .map((i) => parseLine(i, pantry, byName))
    .filter((l): l is ImportedLine => l !== null)
  return {
    name: str(r.name) ?? '',
    category: str(r.categoryName) ?? '',
    cuisine: str(r.cuisineName) ?? '',
    protein: names(r.proteinNames),
    carbs: names(r.carbNames),
    servings: int(r.servings),
    prepMin: int(r.prepTimeMinutes),
    cookMin: int(r.cookTimeMinutes),
    notes: str(r.notes) ?? '',
    steps: (Array.isArray(r.method) ? r.method : [])
      .map(str)
      .filter((s): s is string => s !== null)
      // A leading "1." or "Step 1:" is the list's, not the step's.
      .map((s) => s.replace(/^(step\s*)?\d+[.):]\s*/i, '')),
    lines,
  }
}

function parseLine(
  i: Record<string, unknown>,
  pantry: readonly PantryEntry[],
  byName: ReadonlyMap<string, PantryEntry>,
): ImportedLine | null {
  if (i.outcome !== 'matched' && i.outcome !== 'new') return null
  const ref = /^P(\d+)$/i.exec(str(i.pantryRef) ?? '')
  const name = str(i.name)
  const found =
    (i.outcome === 'matched' && ref ? pantry[Number(ref[1]) - 1] : undefined) ??
    (name ? byName.get(key(name)) : undefined)
  if (!found && !name) return null
  const qty = amount(i.amount)
  let qtyMax = amount(i.amountUpper)
  if (qty === null) qtyMax = null
  else if (qtyMax !== null && qtyMax <= qty) qtyMax = null
  const lineUnit = qty === null ? null : unit(i.unit)
  return {
    group: str(i.group),
    name: found ? found.name : name!,
    pantryId: found ? found.id : null,
    aisle: found ? null : (aisle(i.aisle) ?? 'cupboard'),
    defaultUnit: found ? null : unit(i.defaultUnit),
    qty,
    qtyMax,
    approx: qty !== null && i.isApproximate === true,
    unit: lineUnit,
  }
}
