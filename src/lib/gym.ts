import { formatKg, toGrams, type RecoveryType } from '@lifeos/fitness'
import type { MuscleView } from '@/data'
import { directed, type SortDirection } from './sort'

/** Preferred RIR and Workouts to stall, as Settings → Gym offers them (GYM-020 1, 3). */
export const RIR_RANGE = [0, 5] as const
export const STALL_RANGE = [2, 20] as const

export const RECOVERY_LABEL: Record<RecoveryType, string> = {
  fast: 'Fast',
  normal: 'Normal',
  slow: 'Slow',
}

/** "Normal · 2 a week · 4 sets", "Yours · Fast · 1 a week · 1 set". */
export function muscleSummary(m: MuscleView): string {
  const sets = `${m.stimulusTarget} ${m.stimulusTarget === 1 ? 'set' : 'sets'}`
  return [
    ...(m.builtIn ? [] : ['Yours']),
    RECOVERY_LABEL[m.recoveryType],
    `${m.frequencyTarget} a week`,
    sets,
  ].join(' · ')
}

/** Same name, whatever its case and spaces. */
export const sameName = (a: string, b: string) =>
  a.trim().replace(/\s+/g, ' ').toLowerCase() === b.trim().replace(/\s+/g, ' ').toLowerCase()

/** "0.625" or "2,5" as whole grams; null unless it is more than 0 and no more than 100 kg. */
export function parseIncrement(text: string): number | null {
  const t = text.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,3})?$|^\.\d{1,3}$/.test(t)) return null
  const grams = toGrams(t)
  return grams > 0 && grams <= 100_000 ? grams : null
}

/** The library's sorts (GYM-003 3), each its own way to start. */
export type LibrarySort = 'az' | 'last' | 'muscle'
export const LIBRARY_SORTS: readonly {
  value: LibrarySort
  label: string
  initial: SortDirection
}[] = [
  { value: 'az', label: 'A–Z', initial: 'asc' },
  { value: 'last', label: 'Last done', initial: 'desc' },
  { value: 'muscle', label: 'Primary muscle', initial: 'asc' },
]

/** What the library shows (GYM-003 2, 3): a search, filters, and a sort. */
export interface LibraryFilter {
  search: string
  /** Muscle group names, primary or secondary. */
  muscles: readonly string[]
  categories: readonly string[]
  equipment: readonly string[]
  sort: LibrarySort
  direction: SortDirection
}

/** What the library needs of an Exercise. */
export interface LibraryRow {
  id: string
  name: string
  primary: { name: string; category: string; position: number } | undefined
  secondaries: readonly string[]
  equipment: string | undefined
  /** When it was last done, ms; null if never. */
  lastDone: number | null
}

/**
 * The library's Exercises (GYM-003): matching the search by name, any of
 * each filter's values (muscles primary or secondary), all filters
 * together; sorted A–Z, by last done (never done last) or by primary group,
 * in the body's order.
 */
export function libraryRows<R extends LibraryRow>(rows: readonly R[], f: LibraryFilter): R[] {
  const words = f.search.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const shown = rows.filter(
    (r) =>
      words.every((w) => r.name.toLowerCase().includes(w)) &&
      (!f.muscles.length ||
        f.muscles.some((m) => r.primary?.name === m || r.secondaries.includes(m))) &&
      (!f.categories.length || f.categories.includes(r.primary?.category ?? '')) &&
      (!f.equipment.length || f.equipment.includes(r.equipment ?? '')),
  )
  const byName = (a: R, b: R) => a.name.localeCompare(b.name)
  const option = LIBRARY_SORTS.find((s) => s.value === f.sort) ?? LIBRARY_SORTS[0]!
  if (f.sort === 'last') {
    // Never done stays last, whichever way round.
    const done = shown.filter((r) => r.lastDone !== null)
    const never = shown.filter((r) => r.lastDone === null).sort(byName)
    done.sort(
      directed((a, b) => b.lastDone! - a.lastDone! || byName(a, b), option.initial, f.direction),
    )
    return [...done, ...never]
  }
  const compare =
    f.sort === 'muscle'
      ? (a: R, b: R) =>
          CATEGORY_ORDER.indexOf(a.primary?.category ?? '') -
            CATEGORY_ORDER.indexOf(b.primary?.category ?? '') ||
          (a.primary?.position ?? 99) - (b.primary?.position ?? 99) ||
          (a.primary?.name ?? '').localeCompare(b.primary?.name ?? '') ||
          byName(a, b)
      : byName
  return [...shown].sort(directed(compare, option.initial, f.direction))
}

const CATEGORY_ORDER = ['push', 'pull', 'core', 'legs']

/** A secondary's contribution in brackets: "Triceps (0.4)" (gym.md, A workout). */
export const withShare = (name: string, contribution: number) =>
  `${name} (${contribution.toFixed(1)})`

/** A Current set: "60 kg × 8". */
export const currentText = (weightGrams: number, reps: number) =>
  `${formatKg(weightGrams)} kg × ${reps}`
