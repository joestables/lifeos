import { newId } from './ids'
import type {
  CookFields,
  HeadingPatch,
  LineFields,
  MealFields,
  PantryFields,
  ValueKind,
  VariationPatch,
} from './food'
import type { WriteQueue } from './queue/queue'

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'

/**
 * A position between two others (byte order, as the database's "C"
 * collation sorts them), so a line or step moves without renumbering the
 * rest. Either end may be missing: the first, or the last.
 */
export function positionBetween(before?: string | null, after?: string | null): string {
  const lo = before ?? ''
  const hi = after ?? ''
  let out = ''
  for (let i = 0; ; i++) {
    const a = i < lo.length ? DIGITS.indexOf(lo[i]!) : 0
    const b = i < hi.length ? DIGITS.indexOf(hi[i]!) : DIGITS.length
    if (b - a > 1) return out + DIGITS[Math.floor((a + b) / 2)]
    out += DIGITS[a]
  }
}

/** Positions for n rows in order, spread so later moves have room. */
export function positionsFor(n: number): string[] {
  const out: string[] = []
  let last: string | null = null
  for (let i = 0; i < n; i++) {
    last = positionBetween(last, null)
    out.push(last)
  }
  return out
}

/**
 * Food's writes (ADR-0042, ADR-0052): each queues one function of the
 * `food` schema and returns at once; ids are made here.
 */
export function foodWrites(queue: WriteQueue) {
  return {
    /** A new Recipe with its first Variation, an Idea or a Draft (RCP-002, RCP-006). */
    createRecipe(
      name: string,
      status: 'idea' | 'active' = 'idea',
      variationName = 'Standard',
    ): { recipe: string; variation: string } {
      const recipe = newId()
      const variation = newId()
      queue.enqueue(
        'food.create_recipe',
        {
          p_id: recipe,
          p_variation: variation,
          p_name: name,
          p_status: status,
          p_variation_name: variationName,
        },
        [recipe, variation],
      )
      return { recipe, variation }
    },
    updateRecipe(recipe: string, patch: HeadingPatch): void {
      queue.enqueue('food.update_recipe', { p_id: recipe, p_patch: patch }, [recipe])
    },
    /** My Variation of a Recipe I can see, a copy of another, or empty (RCP-009, RCP-017). */
    /** `copied`: the ids of the lines and steps `from` has, each given a new id here (RCP-016 1). */
    addVariation(
      recipe: string,
      name: string,
      from?: string,
      copied: readonly string[] = [],
    ): string {
      const id = newId()
      const ids = Object.fromEntries(copied.map((c) => [c, newId()]))
      queue.enqueue(
        'food.add_variation',
        {
          p_id: id,
          p_recipe: recipe,
          p_name: name,
          ...(from && { p_from: from, p_ids: ids }),
        },
        [id],
      )
      return id
    },
    updateVariation(variation: string, patch: VariationPatch): void {
      queue.enqueue('food.update_variation', { p_id: variation, p_patch: patch }, [variation])
    },
    /** `id`: the editor's own row, so the kept line takes its place. */
    addLine(variation: string, fields: LineFields, id = newId()): string {
      queue.enqueue('food.add_line', { p_id: id, p_variation: variation, p_fields: fields }, [
        variation,
      ])
      return id
    },
    updateLine(variation: string, id: string, patch: LineFields): void {
      queue.enqueue('food.update_line', { p_id: id, p_patch: patch }, [variation])
    },
    removeLine(variation: string, id: string): void {
      queue.enqueue('food.remove_line', { p_id: id }, [variation])
    },
    addStep(variation: string, text: string, position: string): string {
      const id = newId()
      queue.enqueue(
        'food.add_step',
        { p_id: id, p_variation: variation, p_text: text, p_position: position },
        [variation],
      )
      return id
    },
    updateStep(variation: string, id: string, patch: { text?: string; position?: string }): void {
      queue.enqueue('food.update_step', { p_id: id, p_patch: patch }, [variation])
    },
    removeStep(variation: string, id: string): void {
      queue.enqueue('food.remove_step', { p_id: id }, [variation])
    },
    /** A cook, its snapshot taken by the server (RCP-012). */
    logCook(variation: string, fields: CookFields): string {
      const id = newId()
      queue.enqueue('food.log_cook', { p_id: id, p_variation: variation, p_fields: fields }, [
        variation,
      ])
      return id
    },
    updateCook(id: string, patch: Omit<CookFields, 'meal_id'>): void {
      queue.enqueue('food.update_cook', { p_id: id, p_patch: patch }, [])
    },
    removeCook(id: string): void {
      queue.enqueue('food.remove_cook', { p_id: id }, [])
    },
    /** A name added to my list as I type it (RCP-006 5). */
    /**
     * A new Pantry entry (PAN-001 2): an ingredient in the aisle chosen,
     * Cupboard to start; from a Recipe's line, with its unit (PAN-004 1).
     */
    addPantry(fields: PantryFields & { name: string }, id = newId()): string {
      const kind = fields.kind ?? 'ingredient'
      queue.enqueue(
        'food.add_pantry',
        {
          p_id: id,
          p_fields: {
            name: fields.name,
            kind,
            ...(kind === 'ingredient' && { aisle: fields.aisle ?? 'cupboard' }),
            ...(fields.default_unit && { default_unit: fields.default_unit }),
          },
        },
        [],
      )
      return id
    },
    /** An entry I added, changed (PAN-001 3): a rename shows in every Recipe. */
    updatePantry(id: string, patch: PantryFields): void {
      queue.enqueue('food.update_pantry', { p_id: id, p_patch: patch }, [])
    },
    /** An entry I added that nothing uses (PAN-001 4). */
    removePantry(id: string): void {
      queue.enqueue('food.remove_pantry', { p_id: id }, [])
    },
    /** Two entries I added made one (PAN-003): `merge`'s lines and staples move to `keep`. */
    mergePantry(keep: string, merge: string): void {
      queue.enqueue('food.merge_pantry', { p_keep: keep, p_merge: merge }, [])
    },
    /** One of a Space's staples, and whether it has run out; or not a staple (PAN-002). */
    setStaple(space: string, pantry: string, staple: boolean, outOfStock = false): void {
      queue.enqueue(
        'food.set_staple',
        { p_space: space, p_pantry: pantry, p_staple: staple, p_out_of_stock: outOfStock },
        [],
      )
    },
    /**
     * A Meal in a slot (MPL-002): of a Variation, typed, or leftovers of
     * another. Its name is sent: the Recipe's, what was typed, or the
     * Meal it is leftovers of.
     */
    planMeal(fields: MealFields, id = newId()): string {
      const { variation, servings, leftovers_of, ...item } = fields
      queue.enqueue(
        'food.plan_meal',
        {
          p_id: id,
          p_fields: {
            ...item,
            status: 'active',
            ...(variation && { variation }),
            ...(servings && { servings }),
            ...(leftovers_of && { leftovers_of }),
          },
        },
        [id],
      )
      return id
    },
    /** A Meal's servings (MPL-003). */
    updateMeal(id: string, patch: { servings?: number | null }): void {
      queue.enqueue('food.update_meal', { p_id: id, p_patch: patch }, [id])
    },
    /** Which Variation a Meal uses (MPL-003 1). */
    setMealVariation(meal: string, variation: string): void {
      queue.enqueue('food.set_meal_variation', { p_meal: meal, p_variation: variation }, [meal])
    },
    /** My own words on my change (RCP-013); empty, the note goes. */
    noteChange(activity: number, note: string): void {
      queue.enqueue('food.note_change', { p_activity: activity, p_note: note }, [])
    },
    addValue(kind: ValueKind, name: string): string {
      const id = newId()
      queue.enqueue('food.add_value', { p_id: id, p_kind: kind, p_name: name }, [])
      return id
    },
  }
}

export type FoodWrites = ReturnType<typeof foodWrites>
