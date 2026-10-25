import { isUnit, parseLine, total, type Amount, type ParsedLine } from '@lifeos/food'
import { AISLES, nameKey, type Aisle } from './pantry'

/** Where a line sits on a food shop: an aisle, household items, or Other last (SHP-001 3). */
export type ShopAisle = Aisle | 'household' | 'other'

export const SHOP_AISLES: { key: ShopAisle; label: string }[] = [
  ...(Object.entries(AISLES) as [Aisle, string][]).map(([key, label]) => ({ key, label })),
  { key: 'household', label: 'Household' },
  { key: 'other', label: 'Other' },
]

/** A line as the shop needs it. */
export interface Line {
  id: string
  pantry_id: string | null
  text: string | null
  heading: string | null
  qty: number | null
  qty_max: number | null
  approx: boolean
  unit: string | null
  checked: boolean
  meal_id: string | null
  needed_space_id?: string | null
  position: string
}

export interface PantryLook {
  name: string
  kind: string
  aisle: string | null
}

/** A row of All (SHP-002 3): one ingredient, every line for it, totalled. */
export interface ShopRow {
  key: string
  name: string
  aisle: ShopAisle
  /** Every line under it: ticking the row ticks them all. */
  ids: string[]
  amount: string
  /** Which Meals it is for, then "Extra" for what I added. */
  meta: string
  checked: boolean
  /** The one line added by hand it is, which its menu changes and deletes. */
  own?: Line
}

export const amountOf = (l: Line): Amount => ({
  qty: l.qty,
  qtyMax: l.qty_max,
  approx: l.approx,
  unit: l.unit && isUnit(l.unit) ? l.unit : null,
})

export function aisleOf(l: Line, pantry: ReadonlyMap<string, PantryLook>): ShopAisle {
  const p = l.pantry_id ? pantry.get(l.pantry_id) : undefined
  if (!p) return 'other'
  if (p.kind === 'household') return 'household'
  return (p.aisle as Aisle | null) ?? 'cupboard'
}

const nameOf = (l: Line, pantry: ReadonlyMap<string, PantryLook>) =>
  (l.pantry_id ? pantry.get(l.pantry_id)?.name : null) ?? l.text ?? ''

/**
 * A food shop's All (SHP-002 2, 3; SHP-003 3): its lines but the shop's
 * Space's staples a Meal needs, one row per ingredient (a Pantry entry, or a
 * typed name whatever its case), totalled, grouped by aisle in aisle order
 * with Other last; within an aisle A–Z, ticked rows at the foot.
 */
export function shopRows(
  lines: readonly Line[],
  pantry: ReadonlyMap<string, PantryLook>,
  staples: ReadonlySet<string>,
  mealName: (meal: string) => string | undefined,
): { aisle: ShopAisle; label: string; rows: ShopRow[] }[] {
  const groups = new Map<string, Line[]>()
  for (const l of lines) {
    if (l.heading !== null) continue
    if (l.meal_id && l.pantry_id && staples.has(l.pantry_id)) continue
    const key = l.pantry_id ?? `typed:${nameKey(l.text ?? '')}`
    groups.set(key, [...(groups.get(key) ?? []), l])
  }
  const rows: ShopRow[] = [...groups.entries()].map(([key, ls]) => {
    const meals = [...new Set(ls.map((l) => l.meal_id).filter((m): m is string => m !== null))]
    const names = meals.map(mealName).filter((n): n is string => !!n)
    const extra = ls.some((l) => l.meal_id === null)
    return {
      key,
      name: nameOf(ls[0]!, pantry),
      aisle: aisleOf(ls[0]!, pantry),
      ids: ls.map((l) => l.id),
      amount: total(ls.map(amountOf)),
      meta: [...names, ...(extra ? ['Extra'] : [])].join(', '),
      checked: ls.every((l) => l.checked),
      ...(ls.length === 1 && ls[0]!.meal_id === null && { own: ls[0] }),
    }
  })
  return SHOP_AISLES.map(({ key, label }) => ({
    aisle: key,
    label,
    rows: rows
      .filter((r) => r.aisle === key)
      .sort((a, b) => Number(a.checked) - Number(b.checked) || a.name.localeCompare(b.name)),
  })).filter((g) => g.rows.length)
}

/** A Meal's name with its day, as a line says what it is for: "Katsu curry Thu". */
export function mealLabel(meal: { title: string; do_on: string | null }): string {
  if (!meal.do_on) return meal.title
  const day = new Date(`${meal.do_on}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    timeZone: 'UTC',
  })
  return `${meal.title} ${day}`
}

/** One of a Space's staples or Essentials, as Extra needs it. */
export interface Kept {
  space_id: string
  pantry_id: string
  kind: string
  needed: boolean
}

/** What Extra offers for one Space (SHP-003 3). */
export interface Offers {
  space: string
  needed: { pantry_id: string; kind: string }[]
  essentials: string[]
}

/**
 * Extra's offers (SHP-003 3): for each of my Spaces, the shop's own first,
 * its out-of-stock staples and Required Essentials, then its other
 * Essentials; and the shop's Space's staples its Meals use, to check.
 */
export function extraOffers(
  kept: readonly Kept[],
  spaces: readonly string[],
  shopSpace: string,
  mealPantry: ReadonlySet<string>,
): { offers: Offers[]; staplesUsed: string[] } {
  const order = [shopSpace, ...spaces.filter((s) => s !== shopSpace)]
  const offers = order
    .map((space) => {
      const mine = kept.filter((k) => k.space_id === space)
      return {
        space,
        needed: mine.filter((k) => k.needed).map((k) => ({ pantry_id: k.pantry_id, kind: k.kind })),
        essentials: mine.filter((k) => k.kind === 'essential' && !k.needed).map((k) => k.pantry_id),
      }
    })
    .filter((o) => o.needed.length || o.essentials.length)
  const staplesUsed = kept
    .filter((k) => k.space_id === shopSpace && k.kind === 'staple' && mealPantry.has(k.pantry_id))
    .map((k) => k.pantry_id)
  return { offers, staplesUsed }
}

/** One thing to buy, read from a Thought or Note (SHP-003 5). */
export interface WrittenLine<P> {
  amount: ParsedLine
  /** The Pantry entry it names, if any. */
  pantry?: P
}

/** A name's other forms, for matching "eggs" to Egg and "tomato" to Tomatoes. */
const forms = (key: string) => [
  key,
  `${key}s`,
  `${key}es`,
  ...(key.endsWith('es') ? [key.slice(0, -2)] : []),
  ...(key.endsWith('s') ? [key.slice(0, -1)] : []),
]

/**
 * A Thought's or Note's text as lines to buy (SHP-003 5, ITM-006 5, 6): split
 * at commas and line breaks, and at the "and" ending a list of several ("mac
 * and cheese" alone stays one); a list's bullets and checkboxes and a leading
 * "buy" or "and" dropped, an amount read off the front ("2 milk"), and each
 * matched to the Pantry by name, ignoring case and a plural's "s". A
 * heading ("# Weekend") isn't a line.
 */
export function writtenLines<P extends PantryLook>(
  text: string,
  pantry: ReadonlyMap<string, P>,
): WrittenLine<P>[] {
  const byName = new Map<string, P>()
  // An ingredient wins over a household item of the same name.
  const ingredient = (p: P) => Number(p.kind === 'ingredient')
  for (const p of [...pantry.values()].sort((a, b) => ingredient(a) - ingredient(b)))
    byName.set(nameKey(p.name), p)
  return text
    .split('\n')
    .flatMap((row) => {
      const parts = row.split(/[,;]/)
      // "milk, bread and eggs": the last of a list joined by "and".
      if (parts.length > 1) parts.push(...parts.pop()!.split(/\s+and\s+/i))
      return parts
    })
    .filter((part) => !/^\s*#/.test(part))
    .map((part) =>
      part
        .replace(/^\s*(?:[-*+•]\s+|\d+[.)]\s+)?(?:\[[ xX]?\]\s*)?/, '')
        .replace(/^\s*(?:buy|and)\s+/i, '')
        .replace(/[.!:]+\s*$/, '')
        .trim(),
    )
    .filter(Boolean)
    .map((part) => {
      const amount = parseLine(part)
      const key = nameKey(amount.name)
      const p = forms(key)
        .map((f) => byName.get(f))
        .find(Boolean)
      return p ? { amount, pantry: p } : { amount }
    })
    .filter((l) => l.amount.name)
}

/** Whether a Thought or Note can be a food shop: a line names a Pantry ingredient (Joe, 25 October). */
export const namesAnIngredient = (lines: readonly WrittenLine<PantryLook>[]) =>
  lines.some((l) => l.pantry?.kind === 'ingredient')

/** What a Thought or Note gives a shop: a Thought's words; a Note's body, else its title. */
export const shopText = (item: { type: string; title: string; body: string | null }) =>
  item.type === 'note' && item.body?.trim() ? item.body : item.title
