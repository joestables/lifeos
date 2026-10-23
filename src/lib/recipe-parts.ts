import { findTimer, formatAmount, parseLine, scale, type StepTimer, type Unit } from '@lifeos/food'
import type { Cook, Line, PantryEntry, Step } from '@/data'
import type { VariationView } from '@/data/food-hooks'
import { lineName } from './recipes'

/** A line of ingredients as read; mirrors IngredientList's own shape. */
export interface ShownLine {
  key: string
  amount?: string
  name: string
  /** Not in the Pantry: kept as typed. */
  typed?: boolean
}

export interface ShownGroup {
  heading?: string
  lines: ShownLine[]
}

/** Positions compare by bytes, as the database's "C" collation does. */
export const byPosition = (a: { position: string }, b: { position: string }) =>
  a.position < b.position ? -1 : a.position > b.position ? 1 : 0

/**
 * A Variation's lines under their subheadings (RCP-005 1), each amount
 * scaled by a factor (RCP-011 2) and rounded for showing (ADR-0053).
 */
export function ingredientGroups(
  lines: readonly Line[],
  pantry: ReadonlyMap<string, PantryEntry>,
  factor = 1,
): ShownGroup[] {
  const groups: ShownGroup[] = [{ lines: [] }]
  for (const l of [...lines].sort(byPosition)) {
    if (l.heading !== null) {
      groups.push({ heading: l.heading, lines: [] })
      continue
    }
    const amount = formatAmount(
      scale(
        { qty: l.qty, qtyMax: l.qty_max, approx: l.approx, unit: (l.unit as Unit | null) ?? null },
        factor,
      ),
    )
    groups.at(-1)!.lines.push({
      key: l.id,
      ...(amount ? { amount } : {}),
      name: lineName(l, pantry),
      ...(l.pantry_id ? {} : { typed: true }),
    })
  }
  return groups.filter((g) => g.heading !== undefined || g.lines.length > 0)
}

/** A step's text in parts: plain text, and "@" references to Recipes. */
export type TextPart = string | { recipe: string; id: string | null }

const REFERENCE = /@\[([^\]]+)\]\(([0-9a-f-]{36})\)/g

/** How a reference is kept in a step's or the notes' text (RCP-008 2). */
export const referenceText = (name: string, id: string) => `@[${name}](${id})`

/**
 * Splits text at its "@" references: a Recipe I can see shows under its
 * name now; one gone shows as the plain name it had (RCP-008 3).
 */
export function textParts(text: string, titles: ReadonlyMap<string, string>): TextPart[] {
  const parts: TextPart[] = []
  let at = 0
  for (const m of text.matchAll(REFERENCE)) {
    if (m.index > at) parts.push(text.slice(at, m.index))
    const title = titles.get(m[2]!)
    parts.push(title === undefined ? m[1]! : { recipe: title, id: m[2]! })
    at = m.index + m[0].length
  }
  if (at < text.length) parts.push(text.slice(at))
  // Neighbouring plain text joins up.
  return parts.reduce<TextPart[]>((out, p) => {
    const last = out.at(-1)
    if (typeof p === 'string' && typeof last === 'string') out[out.length - 1] = last + p
    else out.push(p)
    return out
  }, [])
}

/** A step's text as typed, references read back as their names: for timers and search. */
export const plainText = (text: string) => text.replace(REFERENCE, '$1')

export interface ShownStep {
  key: string
  parts: TextPart[]
  /** The time it names, for Cooking's timer (RCP-011 3). */
  time: StepTimer | null
}

/** The method in order, each step's references and timer found (RCP-008, RCP-011 3). */
export function methodSteps(
  steps: readonly Step[],
  titles: ReadonlyMap<string, string>,
): ShownStep[] {
  return [...steps]
    .sort(byPosition)
    .filter((s) => s.text.trim())
    .map((s) => ({
      key: s.id,
      parts: textParts(s.text, titles),
      time: findTimer(plainText(s.text)),
    }))
}

/** "Prep 20 min · Cook 25 min", or what there is of it. */
export function timesLine(v: VariationView): string {
  const { prep_min: prep, cook_min: cook } = v.fields
  return [prep ? `Prep ${prep} min` : '', cook ? `Cook ${cook} min` : '']
    .filter(Boolean)
    .join(' · ')
}

/** "Cooked 6 times · last Sat", or nothing before the first cook. */
export function cookedLine(cooks: readonly Cook[], when: (iso: string) => string): string {
  if (!cooks.length) return ''
  const n = cooks.length === 1 ? 'Cooked once' : `Cooked ${cooks.length} times`
  return `${n} · last ${when(cooks[0]!.cooked_at)}`
}

/** The state's name as the spec says it. */
export const STATE_NAMES: Record<string, string> = {
  idea: 'Idea',
  active: 'Draft',
  done: 'Complete',
  cancelled: 'Archived',
}

/**
 * Two Variations' lines side by side (RCP-009 4): each ingredient's amount
 * in both, marked where they differ or one lacks it, in the first's order
 * then the second's extras.
 */
export function compareLines(
  a: readonly Line[],
  b: readonly Line[],
  pantry: ReadonlyMap<string, PantryEntry>,
): { name: string; first: string | null; second: string | null; differs: boolean }[] {
  const amounts = (lines: readonly Line[]) => {
    const out = new Map<string, { name: string; amount: string }>()
    for (const l of [...lines].sort(byPosition)) {
      if (l.heading !== null) continue
      const name = lineName(l, pantry)
      const amount = formatAmount({
        qty: l.qty,
        qtyMax: l.qty_max,
        approx: l.approx,
        unit: (l.unit as Unit | null) ?? null,
      })
      out.set(name.trim().toLowerCase(), { name, amount })
    }
    return out
  }
  const first = amounts(a)
  const second = amounts(b)
  const keys = [...first.keys(), ...[...second.keys()].filter((k) => !first.has(k))]
  return keys.map((k) => {
    const x = first.get(k)
    const y = second.get(k)
    return {
      name: (x ?? y)!.name,
      first: x ? x.amount : null,
      second: y ? y.amount : null,
      differs: !x || !y || x.amount !== y.amount,
    }
  })
}

/**
 * Text to edit: each reference as "@Name" (its Recipe's name now), and what
 * each name stands for, to keep it again by `storedText`.
 */
export function editableText(
  text: string,
  titles: ReadonlyMap<string, string>,
): { text: string; refs: Map<string, string> } {
  const refs = new Map<string, string>()
  const shown = text.replace(REFERENCE, (_, name: string, id: string) => {
    const title = titles.get(id)
    if (title === undefined) return name
    refs.set(title, id)
    return `@${title}`
  })
  return { text: shown, refs }
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Edited text as kept: each "@Name" still standing for a Recipe becomes its reference. */
export function storedText(text: string, refs: ReadonlyMap<string, string>): string {
  // Longest first, so "@Katsu sauce" isn't taken for "@Katsu".
  const names = [...refs.keys()].sort((a, b) => b.length - a.length)
  if (!names.length) return text
  const pattern = new RegExp(`@(${names.map(escape).join('|')})`, 'g')
  return text.replace(pattern, (_, name: string) => referenceText(name, refs.get(name)!))
}

/** The "@" being typed just before the caret, and what follows it so far. */
export function typedReference(
  text: string,
  caret: number,
): { start: number; query: string } | null {
  const m = /(^|\s)@([^@\n]{0,40})$/.exec(text.slice(0, caret))
  if (!m) return null
  return { start: caret - m[2]!.length - 1, query: m[2]! }
}

/** Up to three of my Recipes for an "@" (RCP-008 2): names starting with it first. */
export function suggestRecipes<
  R extends { item: { id: string; title: string }; mine: boolean; state: string },
>(recipes: readonly R[], query: string, except?: string): R[] {
  const q = query.trim().toLowerCase()
  return recipes
    .filter((r) => r.mine && r.state !== 'cancelled' && r.item.id !== except)
    .filter((r) => r.item.title.toLowerCase().includes(q))
    .sort((a, b) => {
      const x = a.item.title.toLowerCase().startsWith(q) ? 0 : 1
      const y = b.item.title.toLowerCase().startsWith(q) ? 0 : 1
      return x - y || a.item.title.localeCompare(b.item.title)
    })
    .slice(0, 3)
}

const exact = (n: number) => String(Math.round(n * 1000) / 1000)

/** A line's amount as it was typed, without its unit: "1–2", "~5", "". */
export function amountText(l: Pick<Line, 'qty' | 'qty_max' | 'approx'>): string {
  if (l.qty == null) return ''
  return `${l.approx ? '~' : ''}${exact(l.qty)}${l.qty_max == null ? '' : `–${exact(l.qty_max)}`}`
}

/**
 * An amount typed in its box, read (RCP-007 3): "1-2", "~5", "½", "200g"
 * (the unit too). Empty is no amount; something unreadable is null.
 */
export function readAmount(
  text: string,
): { qty: number | null; qty_max: number | null; approx: boolean; unit?: Unit } | null {
  if (!text.trim()) return { qty: null, qty_max: null, approx: false }
  const p = parseLine(`${text.trim()} x`)
  if (p.qty === null || p.name.toLowerCase() !== 'x') return null
  return {
    qty: p.qty,
    qty_max: p.qtyMax !== null && p.qtyMax > p.qty ? p.qtyMax : null,
    approx: p.approx,
    ...(p.unit ? { unit: p.unit } : {}),
  }
}
