import { useState } from 'react'
import type { SortDirection } from '@/lib/sort'

/** My Outfits, the collection every outfit is in (WRD-018 1). */
export const MY_OUTFITS = 'my-outfits'

export type OutfitSort = 'added' | 'worn' | 'times'
export const OUTFIT_SORTS: { value: OutfitSort; label: string; initial: SortDirection }[] = [
  { value: 'added', label: 'Recently added', initial: 'desc' },
  { value: 'worn', label: 'Last worn', initial: 'desc' },
  { value: 'times', label: 'Times worn', initial: 'desc' },
]

const KEY = 'lifeos.wardrobe.outfits'

interface Kept {
  collection: string
  sort: OutfitSort
  sortDir: SortDirection
}

function read(): Kept {
  const start: Kept = { collection: MY_OUTFITS, sort: 'added', sortDir: 'desc' }
  try {
    return { ...start, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Kept>) }
  } catch {
    return start
  }
}

/** The collection shown and the sort, kept for next time (WRD-016 1, 4). */
export function useOutfitsView() {
  const [kept, setKept] = useState(read)
  const change = (patch: Partial<Kept>) =>
    setKept((k) => {
      const next = { ...k, ...patch }
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        // Kept for this visit only.
      }
      return next
    })
  return { kept, change }
}
