import type { ImportedLine, Unit } from '@lifeos/food'
import type { Aisle } from './pantry'

/**
 * What the AI suggested for an ingredient it couldn't match to the Pantry
 * (Joe, 16 November): its aisle and default unit, so a line kept as typed
 * from Fill from method or an import starts Add to the Pantry with them
 * rather than with Cupboard. Kept by name on this device, the newest few
 * hundred; only a starting point, so losing them loses nothing.
 */
export interface PantryHint {
  aisle: Aisle | null
  defaultUnit: Unit | null
}

const KEY = 'lifeos.pantry-hints'
const MOST = 300
const nameKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase()

let hints: Map<string, PantryHint> | null = null

function load(): Map<string, PantryHint> {
  if (hints) return hints
  hints = new Map()
  try {
    const kept = JSON.parse(localStorage.getItem(KEY) ?? '[]') as [string, PantryHint][]
    if (Array.isArray(kept)) hints = new Map(kept)
  } catch {
    // None kept, or not readable: nothing to start from.
  }
  return hints
}

/** Remembers the suggestions of the lines the AI read that matched nothing. */
export function rememberHints(lines: readonly ImportedLine[]): void {
  const map = load()
  let changed = false
  for (const l of lines) {
    if (l.pantryId || (!l.aisle && !l.defaultUnit)) continue
    const k = nameKey(l.name)
    map.delete(k)
    map.set(k, { aisle: l.aisle, defaultUnit: l.defaultUnit })
    changed = true
  }
  if (!changed) return
  while (map.size > MOST) map.delete(map.keys().next().value!)
  try {
    localStorage.setItem(KEY, JSON.stringify([...map]))
  } catch {
    // Kept for this visit only.
  }
}

/** The AI's suggestion for a name, if it made one. */
export function hintFor(name: string): PantryHint | undefined {
  return load().get(nameKey(name))
}
