import { useMemo, useState } from 'react'
import type { Period } from './progression'
import type { GymData } from '@/data'
import {
  libraryRows,
  type LibraryFilter,
  type MuscleListFilter,
  type MuscleSort,
  type TemplateSort,
} from '@/lib/gym'
import type { SortDirection } from '@/lib/sort'

const KEY = 'lifeos.gym.library'
export type Kept = Omit<LibraryFilter, 'search'>
const DEFAULT: Kept = {
  muscles: [],
  categories: [],
  equipment: [],
  templates: [],
  sort: 'az',
  direction: 'asc',
}

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
      lastDone: x.lastDone,
      templates: gym.templates
        .filter((t) => t.lines.some((l) => l.exercise?.item.id === x.item.id))
        .map((t) => t.item.id),
      view: x,
    }))
    return libraryRows(rows, filter).map((r) => r.view)
  }, [gym.exercises, gym.templates, filter])
}

const MUSCLE_LIST_KEY = 'lifeos.gym.progression-muscles'
export type KeptMuscles = Omit<MuscleListFilter, 'search'>
const MUSCLE_LIST_DEFAULT: KeptMuscles = {
  categories: [],
  muscles: [],
  sort: 'group',
  direction: 'asc',
}

/** Progression → Muscles' filters and sort, kept on this device; the search is for this visit. */
export function useMuscleListFilter() {
  const [kept, setKept] = useState<KeptMuscles>(() => {
    try {
      return {
        ...MUSCLE_LIST_DEFAULT,
        ...(JSON.parse(localStorage.getItem(MUSCLE_LIST_KEY) ?? '{}') as Partial<KeptMuscles>),
      }
    } catch {
      return MUSCLE_LIST_DEFAULT
    }
  })
  const [search, setSearch] = useState('')
  const change = (patch: Partial<KeptMuscles>) =>
    setKept((k) => {
      const next = { ...k, ...patch }
      try {
        localStorage.setItem(MUSCLE_LIST_KEY, JSON.stringify(next))
      } catch {
        // Kept for this visit only.
      }
      return next
    })
  return { filter: { ...kept, search } as MuscleListFilter, change, setSearch }
}

const TEMPLATE_KEY = 'lifeos.gym.templates'

/** All templates' sort, kept for next time on this device (GYM-022 2). */
export function useTemplateSort() {
  const [kept, setKept] = useState<{ sort: TemplateSort; direction: SortDirection }>(() => {
    try {
      return {
        sort: 'recent',
        direction: 'desc',
        ...(JSON.parse(localStorage.getItem(TEMPLATE_KEY) ?? '{}') as object),
      }
    } catch {
      return { sort: 'recent', direction: 'desc' }
    }
  })
  const change = (sort: TemplateSort, direction: SortDirection) => {
    setKept({ sort, direction })
    try {
      localStorage.setItem(TEMPLATE_KEY, JSON.stringify({ sort, direction }))
    } catch {
      // Kept for this visit only.
    }
  }
  return { ...kept, change }
}

const MUSCLE_KEY = 'lifeos.gym.muscles'

/** The Recovery tab's muscle sort, kept for next time on this device (GYM-016 4). */
export function useMuscleSort() {
  const [kept, setKept] = useState<{ sort: MuscleSort; direction: SortDirection }>(() => {
    try {
      return {
        sort: 'readiness',
        direction: 'asc',
        ...(JSON.parse(localStorage.getItem(MUSCLE_KEY) ?? '{}') as object),
      }
    } catch {
      return { sort: 'readiness', direction: 'asc' }
    }
  })
  const change = (sort: MuscleSort, direction: SortDirection) => {
    setKept({ sort, direction })
    try {
      localStorage.setItem(MUSCLE_KEY, JSON.stringify({ sort, direction }))
    } catch {
      // Kept for this visit only.
    }
  }
  return { ...kept, change }
}

const PERIOD_KEY = 'lifeos.gym.period'

/** Progression's period, kept for next time on this device; 3 months to start. */
export function useProgressionPeriod() {
  const [period, setPeriod] = useState<Period>(() => {
    try {
      const kept = localStorage.getItem(PERIOD_KEY)
      return kept === '1m' || kept === '1y' ? kept : '3m'
    } catch {
      return '3m'
    }
  })
  const change = (next: Period) => {
    setPeriod(next)
    try {
      localStorage.setItem(PERIOD_KEY, next)
    } catch {
      // Kept for this visit only.
    }
  }
  return { period, change }
}
