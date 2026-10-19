import { formatAmount, type Unit } from '@lifeos/food'
import type { Activity, Cook, PantryEntry } from '@/data'
import type { RecipeView } from '@/data/food-hooks'
import { STATE_NAMES } from './recipe-parts'

/** An entry of a Recipe's log (RCP-013): a cook, or what changed. */
export interface LogItem {
  key: string
  kind: 'cook' | 'change'
  /** The Variation it is about, for filtering; none for the heading. */
  variation: string | null
  actor: string | null
  at: string
  /** "Cooked Air fryer", "Changed Standard", "Changed the heading". */
  what: string
  /** "Honey 1 → 1–2 tbsp; a step rewritten". */
  detail?: string
  cook?: Cook
}

/** Edits by one person to one thing within this long make one entry. */
const GROUP_MS = 60 * 60 * 1000

type Row = Record<string, unknown> | null
type Change = { from?: unknown; to?: unknown }

const amountOf = (r: Record<string, unknown>) =>
  formatAmount({
    qty: (r.qty as number | null) ?? null,
    qtyMax: (r.qty_max as number | null) ?? null,
    approx: Boolean(r.approx),
    unit: (r.unit as Unit | null) ?? null,
  }) || '—'

function lineChange(c: Change, pantry: ReadonlyMap<string, PantryEntry>): string | null {
  const from = (c.from ?? null) as Row
  const to = (c.to ?? null) as Row
  const name = (r: Record<string, unknown>) =>
    (typeof r.pantry_id === 'string' && pantry.get(r.pantry_id)?.name) ||
    (r.text as string | null) ||
    ''
  if (!from && to) return to.heading ? `added "${String(to.heading)}"` : `added ${name(to)}`
  if (from && !to)
    return from.heading ? `removed "${String(from.heading)}"` : `removed ${name(from)}`
  if (!from || !to) return null
  if (from.heading !== null || to.heading !== null)
    return from.heading === to.heading
      ? 'lines reordered'
      : `"${String(from.heading)}" → "${String(to.heading)}"`
  if (name(from) !== name(to)) return `${name(from)} → ${name(to)}`
  if (amountOf(from) !== amountOf(to)) return `${name(to)} ${amountOf(from)} → ${amountOf(to)}`
  return from.position !== to.position ? 'lines reordered' : null
}

function stepChange(c: Change): string | null {
  const from = (c.from ?? null) as Row
  const to = (c.to ?? null) as Row
  if (!from && to) return 'a step added'
  if (from && !to) return 'a step removed'
  if (!from || !to) return null
  if (from.text !== to.text) return 'a step rewritten'
  return from.position !== to.position ? 'steps reordered' : null
}

const shown = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v))

function listChange(label: string, c: Change): string {
  const from = new Set((c.from as string[] | null) ?? [])
  const to = new Set((c.to as string[] | null) ?? [])
  const added = [...to].filter((v) => !from.has(v)).map((v) => `+${v}`)
  const removed = [...from].filter((v) => !to.has(v)).map((v) => `−${v}`)
  return `${label} ${[...added, ...removed].join(' ')}`.trim()
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** What a Variation's or the heading's own fields changed, in words. */
function fieldChanges(
  changed: Activity['changed'],
  names: ReadonlyMap<string, string>,
  pantry: ReadonlyMap<string, PantryEntry>,
): string[] {
  const out: string[] = []
  for (const [key, value] of Object.entries(changed)) {
    const c = value as Change
    switch (key) {
      case 'line': {
        const s = lineChange(c, pantry)
        if (s) out.push(s)
        break
      }
      case 'step': {
        const s = stepChange(c)
        if (s) out.push(s)
        break
      }
      case 'title':
        out.push(`renamed "${shown(c.from)}" → "${shown(c.to)}"`)
        break
      case 'servings':
        out.push(`serves ${shown(c.from)} → ${shown(c.to)}`)
        break
      case 'prep_min':
        out.push(`prep ${shown(c.from)} → ${shown(c.to)} min`)
        break
      case 'cook_min':
        out.push(`cook ${shown(c.from)} → ${shown(c.to)} min`)
        break
      case 'notes':
        out.push('notes changed')
        break
      case 'sources':
        out.push('sources changed')
        break
      case 'category':
      case 'cuisine':
        out.push(`${key} ${shown(c.from)} → ${shown(c.to)}`)
        break
      case 'tags':
      case 'protein':
      case 'carbs':
        out.push(listChange(key, c))
        break
      case 'default_variation':
        out.push(`opens on ${names.get(String(c.to)) ?? 'another variation'}`)
        break
    }
  }
  return out
}

/**
 * A Recipe's log, newest first (RCP-013 1, 2): its cooks; Variations made,
 * changed, marked or deleted; heading changes; archiving. Edits by one
 * person to one thing close together are one entry. The Recipe's state,
 * worked out by the server, isn't an entry of its own.
 */
export function recipeLog(
  recipe: RecipeView,
  activity: readonly Activity[],
  pantry: ReadonlyMap<string, PantryEntry>,
): LogItem[] {
  const names = new Map(recipe.variations.map((v) => [v.item.id, v.item.title]))
  const several = recipe.variations.length > 1
  const label = (id: string) => (several ? ` ${names.get(id) ?? ''}`.trimEnd() : '')
  const isRecipe = (a: Activity) => a.item_id === recipe.item.id
  const items: LogItem[] = recipe.cooks.map((c) => ({
    key: `cook:${c.id}`,
    kind: 'cook',
    variation: c.variation_id,
    actor: c.person_id,
    at: c.cooked_at,
    what: `Cooked${label(c.variation_id)}`,
    cook: c,
  }))
  const madeAt = new Date(recipe.item.created_at).getTime()
  // The change entry made last, and its parts, oldest first, to fold earlier edits into.
  let open: { item: LogItem; parts: string[] } | null = null
  const changes: { item: LogItem; parts: string[] }[] = []

  for (const a of [...activity].sort((x, y) => (x.at < y.at ? 1 : -1))) {
    const variation = isRecipe(a) ? null : a.item_id
    const name = variation ? (names.get(variation) ?? 'a variation') : ''
    const base = { variation, actor: a.actor, at: a.at, kind: 'change' as const }
    const status = a.changed.status as Change | undefined
    if (a.verb === 'created') {
      // The first Variation is made with its Recipe.
      if (variation && Math.abs(new Date(a.at).getTime() - madeAt) < 60_000) continue
      items.push({ ...base, key: `a:${a.id}`, what: variation ? `Made ${name}` : 'Added' })
    } else if (a.verb === 'archived' || a.verb === 'restored') {
      const done = a.verb === 'archived' ? 'Deleted' : 'Brought back'
      items.push({ ...base, key: `a:${a.id}`, what: variation ? `${done} ${name}` : done })
    } else if (
      a.verb === 'updated' &&
      status &&
      (variation || status.to === 'cancelled' || status.from === 'cancelled')
    ) {
      const state = STATE_NAMES[String(status.to)] ?? ''
      const what = variation
        ? `Marked${label(variation)} ${state}`
        : status.to === 'cancelled'
          ? 'Archived'
          : 'Brought back'
      items.push({ ...base, key: `a:${a.id}`, what })
    } else if (a.verb === 'updated') {
      const parts = fieldChanges(a.changed, names, pantry)
      if (!parts.length) continue
      const what = variation ? `Changed${label(variation)}` : 'Changed the heading'
      // Newest first: the open entry is a later edit of the same thing.
      if (
        open &&
        open.item.what === what &&
        open.item.actor === a.actor &&
        new Date(open.item.at).getTime() - new Date(a.at).getTime() < GROUP_MS
      ) {
        open.parts.unshift(...parts)
        continue
      }
      const item: LogItem = { ...base, key: `a:${a.id}`, what }
      open = { item, parts }
      changes.push(open)
      items.push(item)
    }
  }
  for (const c of changes) c.item.detail = capitalise([...new Set(c.parts)].join('; '))
  return items.sort((x, y) => (x.at < y.at ? 1 : x.at > y.at ? -1 : 0))
}

/** The log narrowed to one Variation, or to cooks (RCP-013 3). */
export function filterLog(log: readonly LogItem[], filter: 'all' | 'cooks' | string): LogItem[] {
  if (filter === 'all') return [...log]
  if (filter === 'cooks') return log.filter((l) => l.kind === 'cook')
  return log.filter((l) => l.variation === filter)
}
