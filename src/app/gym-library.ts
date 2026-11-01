import { useMemo, useState } from 'react'
import type { GymData } from '@/data'
import { libraryRows, type LibraryFilter } from '@/lib/gym'

const KEY = 'lifeos.gym.library'
export type Kept = Omit<LibraryFilter, 'search'>
const DEFAULT: Kept = { muscles: [], categories: [], equipment: [], sort: 'az', direction: 'asc' }

function read(): Kept {
  try {
    return { ...DEFAULT, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Kept>) }
  } catch {
    return DEFAULT
  }
}

/** The library's filters and sort, kept for next time on this device (GYM-003 3); the search is for this visit. */
export function useLibraryFilter() {
  const [kept, setKept] = useState(read)
  const [search, setSearch] = useState('')
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
  return { filter: { ...kept, search } as LibraryFilter, change, setSearch }
}

/** The library's Exercises, not archived ones, as the filter has them (GYM-003). */
export function useLibrary(gym: GymData, filter: LibraryFilter) {
  return useMemo(() => {
    const live = gym.exercises.filter((x) => !x.archived)
    const rows = live.map((x) => ({
      id: x.item.id,
      name: x.item.title,
      primary: x.primary,
      secondaries: x.secondaries.map((s) => s.muscle.name),
      equipment: x.equipment?.name,
      // Workouts come with plan step 8.
      lastDone: null,
      view: x,
    }))
    return libraryRows(rows, filter).map((r) => r.view)
  }, [gym.exercises, filter])
}
