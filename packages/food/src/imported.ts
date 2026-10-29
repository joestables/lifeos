import type { Unit } from './units.ts'

/** The six aisles, in shopping order (ADR-0012). */
export const AISLES = ['fruit_veg', 'bakery', 'protein', 'chilled', 'cupboard', 'frozen'] as const
export type Aisle = (typeof AISLES)[number]

/**
 * A line the AI read (ADR-0054): a Pantry entry it matched (`pantryId`), or
 * one it suggests adding (`aisle`, `defaultUnit`), under the source's
 * `group` heading when it had one.
 */
export interface ImportedLine {
  group: string | null
  name: string
  pantryId: string | null
  aisle: Aisle | null
  defaultUnit: Unit | null
  qty: number | null
  qtyMax: number | null
  approx: boolean
  unit: Unit | null
}

/** A recipe the AI wrote up from a page or a video (RCP-014), not yet kept. */
export interface ImportedRecipe {
  name: string
  category: string
  cuisine: string
  protein: string[]
  carbs: string[]
  servings: number | null
  prepMin: number | null
  cookMin: number | null
  notes: string
  steps: string[]
  lines: ImportedLine[]
}

/** Why the AI can't be used now, or why an import made nothing. */
export type AiRefusal =
  | 'off'
  | 'allowance'
  | 'quota'
  | 'unreachable'
  | 'not_recipe'
  | 'too_little'
  | 'bad_link'
  | 'slow'
  | 'failed'

/** What `recipe.import` answers. */
export type ImportAnswer =
  | {
      ok: true
      recipes: ImportedRecipe[]
      /** The page's picture, as a data URL, when it had one. */
      photo: string | null
      left: number
    }
  | { ok: false; reason: AiRefusal }

/** What `recipe.fill_lines` answers (RCP-007 5). */
export type FillAnswer =
  { ok: true; lines: ImportedLine[]; left: number } | { ok: false; reason: AiRefusal }

/** What `meal.ingredients` answers (MPL-006 2): a page's lines and servings only. */
export type MealAnswer =
  | { ok: true; lines: ImportedLine[]; servings: number | null; left: number }
  | { ok: false; reason: AiRefusal }

/** What `status` answers: whether the AI can be used, and how much is left today. */
export type AiStatus = { available: true; left: number } | { available: false; reason: AiRefusal }
