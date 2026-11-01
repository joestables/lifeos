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

/** All templates' sorts (GYM-022 2), each its own way to start. */
export type TemplateSort = 'recent' | 'popular' | 'exercises' | 'sets' | 'az'
export const TEMPLATE_SORTS: readonly {
  value: TemplateSort
  label: string
  initial: SortDirection
}[] = [
  { value: 'recent', label: 'Most recently used', initial: 'desc' },
  { value: 'popular', label: 'Most used this month', initial: 'desc' },
  { value: 'exercises', label: 'Exercises', initial: 'desc' },
  { value: 'sets', label: 'Sets', initial: 'desc' },
  { value: 'az', label: 'A–Z', initial: 'asc' },
]

/** What sorting a template needs. */
export interface TemplateRow {
  name: string
  exerciseCount: number
  setCount: number
  /** When last used, ms; null if never. */
  lastUsed: number | null
  /** Workouts that followed it in the last month. */
  usesThisMonth: number
}

/**
 * Templates sorted (GYM-022 2): by when last used (never used last, either
 * way round), uses this month, exercises, sets or A–Z; ties by name.
 */
export function sortTemplates<T extends TemplateRow>(
  rows: readonly T[],
  sort: TemplateSort,
  direction: SortDirection,
): T[] {
  const byName = (a: T, b: T) => a.name.localeCompare(b.name)
  const option = TEMPLATE_SORTS.find((s) => s.value === sort) ?? TEMPLATE_SORTS[0]!
  if (sort === 'recent') {
    const used = rows.filter((r) => r.lastUsed !== null)
    const never = rows.filter((r) => r.lastUsed === null).sort(byName)
    used.sort(
      directed((a, b) => b.lastUsed! - a.lastUsed! || byName(a, b), option.initial, direction),
    )
    return [...used, ...never]
  }
  const key: Record<Exclude<TemplateSort, 'recent' | 'az'>, (r: T) => number> = {
    popular: (r) => r.usesThisMonth,
    exercises: (r) => r.exerciseCount,
    sets: (r) => r.setCount,
  }
  const compare =
    sort === 'az' ? byName : (a: T, b: T) => key[sort](b) - key[sort](a) || byName(a, b)
  return [...rows].sort(directed(compare, option.initial, direction))
}

/** "5 exercises", "1 set": a count and its word. */
export const counted = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** A copy's name: "Push A (copy)", then "Push A (copy 2)"… among the names there are. */
export function copyName(name: string, names: readonly string[]): string {
  const taken = new Set(names.map((n) => n.trim().toLowerCase()))
  for (let i = 1; ; i++) {
    const next = `${name.trim()} (copy${i === 1 ? '' : ` ${i}`})`
    if (!taken.has(next.toLowerCase())) return next
  }
}

/** Templates are twenty to a page (GYM-022 1). */
export const TEMPLATES_PER_PAGE = 20
