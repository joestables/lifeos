import type { ImportedRecipe } from '@lifeos/food'
import { useSyncExternalStore } from 'react'

/**
 * The import being checked (RCP-014 1): the recipe chosen from what the AI
 * wrote, its link and picture, and the Idea it goes into, if any. Kept in
 * memory only: nothing of it is saved until Keep, and leaving loses it.
 */
export interface PendingImport {
  recipe: ImportedRecipe
  link: string
  photo: string | null
  /** My Idea being made a Draft from its link (RCP-014 4). */
  idea?: string
}

let pending: PendingImport | null = null
const listeners = new Set<() => void>()

export function setPendingImport(next: PendingImport | null) {
  pending = next
  listeners.forEach((l) => l())
}

export function usePendingImport(): PendingImport | null {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => pending,
  )
}
