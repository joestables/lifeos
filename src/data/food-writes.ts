import { newId } from './ids'
import type { CookFields, HeadingPatch, LineFields, ValueKind, VariationPatch } from './food'
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
    /** A new Pantry entry, an ingredient in the aisle chosen, Cupboard to start (RCP-007 2). */
    addPantry(name: string, aisle = 'cupboard'): string {
      const id = newId()
      queue.enqueue(
        'food.add_pantry',
        { p_id: id, p_fields: { name, kind: 'ingredient', aisle } },
        [],
      )
      return id
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
