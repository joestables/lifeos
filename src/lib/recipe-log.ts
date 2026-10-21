import type { Activity, Cook } from '@/data'
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
  /** "Cooked Air fryer", "Edited", "Marked Complete". */
  what: string
  /** An edit's note, in its maker's own words. */
  detail?: string
  /** An edit: the activity entry it starts with, which its note belongs to. */
  activity?: number
  cook?: Cook
}

/** Edits by one person to one thing within this long make one entry. */
const GROUP_MS = 60 * 60 * 1000

type Change = { from?: unknown; to?: unknown }

/**
 * A Recipe's log, newest first (RCP-013 1, 2): its cooks; Variations made,
 * edited, marked or deleted; the heading edited; archiving. An edit says
 * "Edited", with the note its maker gave it, if any (Joe, 20 October); edits
 * by one person to one thing close together are one entry. The Recipe's
 * state, worked out by the server, isn't an entry of its own.
 */
export function recipeLog(
  recipe: RecipeView,
  activity: readonly Activity[],
  notes: ReadonlyMap<number, string> = new Map(),
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
  // The edit entry made last, to fold earlier edits into.
  let open: LogItem | null = null

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
    } else if (a.verb === 'updated' && Object.keys(a.changed).some((k) => k !== 'status')) {
      const what = variation ? `Edited${label(variation)}` : 'Edited'
      // Newest first: the open entry is a later edit of the same thing, and
      // this earlier one is where it starts.
      if (
        open &&
        open.what === what &&
        open.actor === a.actor &&
        new Date(open.at).getTime() - new Date(a.at).getTime() < GROUP_MS
      ) {
        open.activity = a.id
        continue
      }
      open = { ...base, key: `a:${a.id}`, what, activity: a.id }
      items.push(open)
    }
  }
  for (const i of items) {
    const note = i.activity === undefined ? undefined : notes.get(i.activity)
    if (note) i.detail = note
  }
  return items.sort((x, y) => (x.at < y.at ? 1 : x.at > y.at ? -1 : 0))
}

/** The log narrowed to one Variation, or to cooks (RCP-013 3). */
export function filterLog(log: readonly LogItem[], filter: 'all' | 'cooks' | string): LogItem[] {
  if (filter === 'all') return [...log]
  if (filter === 'cooks') return log.filter((l) => l.kind === 'cook')
  return log.filter((l) => l.variation === filter)
}
