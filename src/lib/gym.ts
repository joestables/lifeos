import {
  currentStrength,
  formatKg,
  toGrams,
  workoutState,
  type RecoveryType,
  type WorkoutStage,
} from '@lifeos/fitness'
import type { MuscleView } from '@/data'
import { whenAgo } from './dates'
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

/** A month, for a template's uses over the last month (GYM-022 2). */
const MONTH_MS = 30 * 24 * 60 * 60 * 1000

/** Templates as sorting needs them: named, with their uses over the last month at `now`. */
export function templateRows<T extends { item: { title: string }; uses: readonly number[] }>(
  templates: readonly T[],
  now: number,
): (T & { name: string; usesThisMonth: number })[] {
  return templates.map((t) => ({
    ...t,
    name: t.item.title,
    usesThisMonth: t.uses.filter((u) => u > now - MONTH_MS && u <= now).length,
  }))
}

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

/** A workout's state as its pill says it (GYM-007 5): Skipped when planned and its day has passed. */
export function pillState(
  stage: WorkoutStage,
  doOn: string | null,
  today: string,
): 'complete' | 'in-progress' | 'planned' | 'skipped' {
  const s = workoutState(stage, doOn ?? today, today)
  return s === 'in_progress' ? 'in-progress' : s
}

/** "58 min", "1 h 04": how long it took (GYM-012 1). */
export function duration(from: string, to: string): string {
  const minutes = Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 60_000))
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`
}

/** "2 of 3 sets" (GYM-008 4): sets logged of the template's number. */
export const setsOf = (logged: number, planned: number) =>
  `${logged} of ${planned} ${planned === 1 ? 'set' : 'sets'}`

/** A set as the SetTable shows it: kg without trailing zeros, its strength to one place. */
export function shownSet(s: {
  weightGrams: number | null
  reps: number | null
  rir: number | null
  pr?: boolean
  strength?: number | null
}): { weight?: string; reps?: number; rir?: number; pr?: boolean; strength?: string } {
  if (s.weightGrams === null || s.reps === null || s.rir === null) return { pr: false }
  return {
    weight: formatKg(s.weightGrams),
    reps: s.reps,
    rir: s.rir,
    pr: s.pr,
    ...(s.strength !== null && s.strength !== undefined && { strength: s.strength.toFixed(1) }),
  }
}

/**
 * Where a new set's popup starts (GYM-010 1): the last tracked set logged
 * on it this workout, else its Current set at my preferred RIR.
 */
export function nextSet(
  sets: readonly { weightGrams: number | null; reps: number | null; rir: number | null }[],
  current: { weightGrams: number; reps: number },
  preferredRir: number,
): { weightGrams: number; reps: number; rir: number } {
  const last = [...sets].reverse().find((s) => s.weightGrams !== null && s.reps !== null)
  return last && last.weightGrams !== null && last.reps !== null
    ? { weightGrams: last.weightGrams, reps: last.reps, rir: last.rir ?? preferredRir }
    : { ...current, rir: preferredRir }
}

/** "62.5" or "62,5" typed as whole grams; null unless 0 to 1000 kg. */
export function parseWeight(text: string): number | null {
  const t = text.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,3})?$|^\.\d{1,3}$/.test(t)) return null
  const grams = toGrams(t)
  return grams <= 1_000_000 ? grams : null
}

/** An Exercise's Current set's strength at my preferred RIR, for Beat current (GYM-012 5). */
export const strengthOfCurrent = (x: { weightGrams: number; reps: number }, preferredRir: number) =>
  currentStrength({ weightGrams: x.weightGrams, reps: x.reps }, preferredRir)

/**
 * "Used yesterday", "Done Mon 28 Oct": when, after a word (GYM-003 1,
 * GYM-006 6); `whenAgo`'s Today, Yesterday and Just now lower-cased.
 */
export function since(word: string, ms: number, now: Date = new Date()): string {
  const when = whenAgo(new Date(ms).toISOString(), now)
  return `${word} ${/^(Today|Yesterday|Just)/.test(when) ? when[0]!.toLowerCase() + when.slice(1) : when}`
}
