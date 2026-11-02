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
  // Short, so the search beside them has room (Joe, 3 November).
  { value: 'last', label: 'Recent', initial: 'desc' },
  { value: 'muscle', label: 'Muscle', initial: 'asc' },
]

/** What the library shows (GYM-003 2, 3): a search, filters, and a sort. */
export interface LibraryFilter {
  search: string
  /** Muscle group names, primary or secondary. */
  muscles: readonly string[]
  categories: readonly string[]
  equipment: readonly string[]
  /** Workout templates' ids: those it is in (Joe, 3 November). */
  templates: readonly string[]
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
  /** The ids of the templates it is in. */
  templates: readonly string[]
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
      (!f.equipment.length || f.equipment.includes(r.equipment ?? '')) &&
      (!f.templates.length || f.templates.some((t) => r.templates.includes(t))),
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
export function pillState(stage: WorkoutStage, doOn: string | null, today: string): PillState {
  const s = workoutState(stage, doOn ?? today, today)
  return s === 'in_progress' ? 'in-progress' : s
}

/** "58 min", "1 h 04": how long it took (GYM-012 1). */
export function duration(from: string, to: string): string {
  return minutesText((Date.parse(to) - Date.parse(from)) / 60_000)
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

/** The heaviest weight the database keeps: 1000 kg, in grams. */
export const MAX_WEIGHT_GRAMS = 1_000_000

/** "62.5" or "62,5" typed as whole grams; null unless 0 to 1000 kg. */
export function parseWeight(text: string): number | null {
  const t = text.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,3})?$|^\.\d{1,3}$/.test(t)) return null
  const grams = toGrams(t)
  return grams <= MAX_WEIGHT_GRAMS ? grams : null
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

// ---------------------------------------------------------------------------
// All workouts (GYM-013 2–5).

export type PillState = 'complete' | 'in-progress' | 'planned' | 'skipped'
export const PILL_STATES: readonly { value: PillState; label: string }[] = [
  { value: 'complete', label: 'Complete' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'planned', label: 'Planned' },
  { value: 'skipped', label: 'Skipped' },
]

export const WORKOUTS_PER_PAGE = 20

/** All workouts' sorts (GYM-013 4), each its own way to start. */
export type WorkoutSort = 'date' | 'duration' | 'sets' | 'stimulus' | 'went' | 'motivation'
export const WORKOUT_SORTS: readonly {
  value: WorkoutSort
  label: string
  initial: SortDirection
}[] = [
  { value: 'date', label: 'Date', initial: 'desc' },
  { value: 'duration', label: 'Duration', initial: 'desc' },
  { value: 'sets', label: 'Sets', initial: 'desc' },
  { value: 'stimulus', label: 'Stimulus sets', initial: 'desc' },
  { value: 'went', label: 'How it went', initial: 'desc' },
  { value: 'motivation', label: 'Motivation', initial: 'desc' },
]

/** A range chosen, both ends included; null is the whole range. */
export type Range = readonly [number, number]

/** What All workouts shows (GYM-013 3, 4): its filters and its sort. */
export interface WorkoutFilter {
  states: PillState[]
  /** Days, "2026-10-01", both included. */
  from: string | null
  to: string | null
  /** Template ids, or NO_TEMPLATE. */
  templates: string[]
  exercises: string[]
  muscles: string[]
  /** 1 low, 2 okay, 3 high. */
  motivation: number[]
  sets: Range | null
  stimulus: Range | null
  exercisesDone: Range | null
  /** Minutes. */
  duration: Range | null
  went: Range | null
  sort: WorkoutSort
  direction: SortDirection
}

export const NO_TEMPLATE = 'none'

export const NO_WORKOUT_FILTER: Omit<WorkoutFilter, 'sort' | 'direction'> = {
  states: [],
  from: null,
  to: null,
  templates: [],
  exercises: [],
  muscles: [],
  motivation: [],
  sets: null,
  stimulus: null,
  exercisesDone: null,
  duration: null,
  went: null,
}

/** A workout as All workouts filters, sorts and averages it. */
export interface WorkoutListRow {
  id: string
  name: string
  day: string
  state: PillState
  templateId: string | null
  /** Exercises with sets logged, and the muscle groups they trained. */
  exerciseIds: readonly string[]
  muscleIds: readonly string[]
  sets: number
  stimulus: number
  exercisesDone: number
  /** Minutes, once finished. */
  minutes: number | null
  howItWent: number | null
  motivation: number | null
  /** When it started, ms; null until it does. */
  startedAt: number | null
}

const within = (range: Range | null, value: number | null) =>
  range === null || (value !== null && value >= range[0] && value <= range[1])
const anyOf = <V>(chosen: readonly V[], value: V) => chosen.length === 0 || chosen.includes(value)
const anyIn = <V>(chosen: readonly V[], values: readonly V[]) =>
  chosen.length === 0 || values.some((v) => chosen.includes(v))

/** Filtered (GYM-013 3): any of a group, every group together; a range leaves out what has no value. */
export function filterWorkouts<T extends WorkoutListRow>(
  rows: readonly T[],
  f: Omit<WorkoutFilter, 'sort' | 'direction'>,
): T[] {
  return rows.filter(
    (r) =>
      anyOf(f.states, r.state) &&
      (f.from === null || r.day >= f.from) &&
      (f.to === null || r.day <= f.to) &&
      anyOf(f.templates, r.templateId ?? NO_TEMPLATE) &&
      anyIn(f.exercises, r.exerciseIds) &&
      anyIn(f.muscles, r.muscleIds) &&
      (f.motivation.length === 0 ||
        (r.motivation !== null && f.motivation.includes(r.motivation))) &&
      within(f.sets, r.sets) &&
      within(f.stimulus, r.stimulus) &&
      within(f.exercisesDone, r.exercisesDone) &&
      within(f.duration, r.minutes) &&
      within(f.went, r.howItWent),
  )
}

/** Newest first: by day, then by when it started. */
const byDate = (a: WorkoutListRow, b: WorkoutListRow) =>
  b.day.localeCompare(a.day) || (b.startedAt ?? 0) - (a.startedAt ?? 0)

/** Sorted (GYM-013 4), either way round; those without the value last, newest first. */
export function sortWorkouts<T extends WorkoutListRow>(
  rows: readonly T[],
  sort: WorkoutSort,
  direction: SortDirection,
): T[] {
  const option = WORKOUT_SORTS.find((s) => s.value === sort) ?? WORKOUT_SORTS[0]!
  if (sort === 'date') return [...rows].sort(directed(byDate, option.initial, direction))
  const value: Record<Exclude<WorkoutSort, 'date'>, (r: T) => number | null> = {
    duration: (r) => r.minutes,
    sets: (r) => r.sets,
    stimulus: (r) => r.stimulus,
    went: (r) => r.howItWent,
    motivation: (r) => r.motivation,
  }
  const of = value[sort]
  const valued = rows.filter((r) => of(r) !== null)
  const without = rows.filter((r) => of(r) === null).sort(byDate)
  valued.sort(directed((a, b) => of(b)! - of(a)! || byDate(a, b), option.initial, direction))
  return [...valued, ...without]
}

/** "58 min", "1 h 04". */
export function minutesText(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`
}

/**
 * What the filters show, in three figures (GYM-013 5), from its complete
 * workouts: average sets, average duration, and weekly sessions — complete
 * workouts a week, from the first shown (or From) to To (or today), over
 * the whole weeks closest, a week at least.
 */
export function workoutAverages(
  rows: readonly WorkoutListRow[],
  today: string,
  range: { from: string | null; to: string | null } = { from: null, to: null },
): { sets: string; duration: string; weekly: string } {
  const done = rows.filter((r) => r.state === 'complete')
  if (done.length === 0) return { sets: '–', duration: '–', weekly: '–' }
  const mean = (xs: number[]) => xs.reduce((n, x) => n + x, 0) / xs.length
  const minutes = done.flatMap((r) => (r.minutes === null ? [] : [r.minutes]))
  const first = range.from ?? done.reduce((d, r) => (r.day < d ? r.day : d), done[0]!.day)
  const last = range.to !== null && range.to < today ? range.to : today
  const days = (Date.parse(last) - Date.parse(first)) / 86_400_000 + 1
  // The whole weeks closest, one at least (Joe, 3 November).
  const weeks = Math.max(1, Math.round(days / 7))
  return {
    sets: mean(done.map((r) => r.sets)).toFixed(1),
    duration: minutes.length ? minutesText(mean(minutes)) : '–',
    weekly: `×${(done.length / weeks).toFixed(1)}`,
  }
}

// ---------------------------------------------------------------------------
// Recovery (GYM-016, GYM-018).

const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' })
const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
const clockTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })
const DAY = 86_400_000
const startOf = (ms: number) => {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
const daysBetween = (from: number, to: number) => Math.round((startOf(to) - startOf(from)) / DAY)

/** When a group was last trained, short: "today", "Sat" within the week, else "28 Oct". */
export function trainedWhen(ms: number, now: number): string {
  const days = daysBetween(ms, now)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return weekday.format(ms)
  return dayMonth.format(ms)
}

/** "last used 5 days ago", "never used" (GYM-018 1). */
export function lastUsedText(ms: number | null, now: number): string {
  if (ms === null) return 'never used'
  const days = daysBetween(ms, now)
  if (days <= 0) return 'last used today'
  if (days === 1) return 'last used yesterday'
  return `last used ${days} days ago`
}

/** The moment the slider stands for (GYM-016 2): "Now", or "+18 h · Fri 12:00". */
export function aheadText(hours: number, at: number): string {
  return hours === 0 ? 'Now' : `+${hours} h · ${weekday.format(at)} ${clockTime.format(at)}`
}

/** "Sat 2 Nov, 09:00": when a group will be fully recovered (GYM-016 5). */
export function recoveredText(ms: number): string {
  return `${weekday.format(ms)} ${dayMonth.format(ms)}, ${clockTime.format(ms)}`
}

/** The muscle list's sorts (GYM-016 4), each its own way to start. */
export type MuscleSort = 'readiness' | 'recent' | 'frequent'
export const MUSCLE_SORTS: readonly {
  value: MuscleSort
  label: string
  initial: SortDirection
}[] = [
  { value: 'readiness', label: 'Readiness', initial: 'asc' },
  { value: 'recent', label: 'Most recently trained', initial: 'desc' },
  { value: 'frequent', label: 'Most frequently trained', initial: 'desc' },
]

/** The same, as a phone has room for them (Joe, 3 November). */
export const MUSCLE_SORTS_SHORT: typeof MUSCLE_SORTS = [
  { value: 'readiness', label: 'Readiness', initial: 'asc' },
  { value: 'recent', label: 'Recent', initial: 'desc' },
  { value: 'frequent', label: 'Frequency', initial: 'desc' },
]

// ---------------------------------------------------------------------------
// Progression → Muscles (GYM-015 1): a list like the exercise library's.

export type MuscleListSort = 'az' | 'recent' | 'group'
export const MUSCLE_LIST_SORTS: readonly {
  value: MuscleListSort
  label: string
  initial: SortDirection
}[] = [
  { value: 'az', label: 'A–Z', initial: 'asc' },
  { value: 'recent', label: 'Recent', initial: 'desc' },
  // By category, then the body's order.
  { value: 'group', label: 'Group', initial: 'asc' },
]

export interface MuscleListFilter {
  search: string
  /** Category keys ("push"). */
  categories: readonly string[]
  /** Muscle group names. */
  muscles: readonly string[]
  sort: MuscleListSort
  direction: SortDirection
}

export interface MuscleListRow {
  name: string
  category: string
  /** Its place in the body's order, category first. */
  order: number
  lastTrained: number | null
}

/** Progression's muscle groups, searched, filtered and sorted; never trained last when by Recent. */
export function muscleListRows<R extends MuscleListRow>(
  rows: readonly R[],
  f: MuscleListFilter,
): R[] {
  const words = f.search.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const shown = rows.filter(
    (r) =>
      words.every((w) => r.name.toLowerCase().includes(w)) &&
      (!f.categories.length || f.categories.includes(r.category)) &&
      (!f.muscles.length || f.muscles.includes(r.name)),
  )
  const option = MUSCLE_LIST_SORTS.find((s) => s.value === f.sort) ?? MUSCLE_LIST_SORTS[0]!
  const byName = (a: R, b: R) => a.name.localeCompare(b.name)
  if (f.sort === 'recent') {
    const trained = shown.filter((r) => r.lastTrained !== null)
    const never = shown.filter((r) => r.lastTrained === null).sort(byName)
    trained.sort(
      directed(
        (a, b) => b.lastTrained! - a.lastTrained! || byName(a, b),
        option.initial,
        f.direction,
      ),
    )
    return [...trained, ...never]
  }
  const compare = f.sort === 'group' ? (a: R, b: R) => a.order - b.order : byName
  return [...shown].sort(directed(compare, option.initial, f.direction))
}

/** What sorting a muscle group needs. */
export interface MuscleRow {
  name: string
  readiness: number
  lastTrained: number | null
  frequency: number
}

/** Muscle groups sorted (GYM-016 4), either way round; never trained last; ties by name. */
export function sortMuscles<T extends MuscleRow>(
  rows: readonly T[],
  sort: MuscleSort,
  direction: SortDirection,
): T[] {
  const option = MUSCLE_SORTS.find((s) => s.value === sort) ?? MUSCLE_SORTS[0]!
  const byName = (a: T, b: T) => a.name.localeCompare(b.name)
  if (sort === 'recent') {
    const trained = rows.filter((r) => r.lastTrained !== null)
    const never = rows.filter((r) => r.lastTrained === null).sort(byName)
    trained.sort(
      directed(
        (a, b) => b.lastTrained! - a.lastTrained! || byName(a, b),
        option.initial,
        direction,
      ),
    )
    return [...trained, ...never]
  }
  const compare =
    sort === 'readiness'
      ? (a: T, b: T) => a.readiness - b.readiness || byName(a, b)
      : (a: T, b: T) => b.frequency - a.frequency || byName(a, b)
  return [...rows].sort(directed(compare, option.initial, direction))
}
