import type { ImportedRecipe } from '@lifeos/food'
import { useSyncExternalStore } from 'react'

/**
 * The import being checked (RCP-014 1): the recipe chosen from what the AI
 * wrote, its link and picture, and the Idea it goes into, if any. Nothing
 * of it is saved until Keep. Held for this tab, so a reload for new code
 * as Check the import opens doesn't lose it (Joe, 26 October); its
 * picture too, when there's room.
 */
export interface PendingImport {
  recipe: ImportedRecipe
  link: string
  photo: string | null
  /** My Idea being made a Draft from its link (RCP-014 4). */
  idea?: string
}

const KEY = 'lifeos.pending-import'

function held(): PendingImport | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as PendingImport) : null
  } catch {
    return null
  }
}

function hold(next: PendingImport | null) {
  try {
    if (!next) return sessionStorage.removeItem(KEY)
    try {
      sessionStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      sessionStorage.setItem(KEY, JSON.stringify({ ...next, photo: null }))
    }
  } catch {
    // Kept in memory only.
  }
}

let pending: PendingImport | null = held()
const listeners = new Set<() => void>()

export function setPendingImport(next: PendingImport | null) {
  pending = next
  hold(next)
  listeners.forEach((l) => l())
}

export function usePendingImport(): PendingImport | null {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => pending,
  )
}
