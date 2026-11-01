import {
  bestByWorkout,
  currentStrength,
  DAY_MS,
  defaultLines,
  inPeriod,
  lastWorkouts,
  relativeChange,
  stalled,
  stimulusByWorkout,
  trains,
  trend,
  WEEK_DAYS,
  weeklyStimulus,
  type BestPoint,
  type ExerciseWorkout,
  type LineCandidate,
  type Trend,
} from '@lifeos/fitness'
import type { GymData, SetView, WorkoutView } from '@/data'
import { engineWorkouts } from './recovery'

/** Progression's periods (gym.md, Progression): 1 month, 3 months, a year. */
export type Period = '1m' | '3m' | '1y'
export const PERIODS: readonly { value: Period; label: string; name: string; days: number }[] = [
  { value: '1m', label: '1 M', name: '1 month', days: 28 },
  { value: '3m', label: '3 M', name: '3 months', days: 91 },
  { value: '1y', label: '1 Y', name: 'A year', days: 364 },
]
export const periodOf = (p: Period) => PERIODS.find((x) => x.value === p) ?? PERIODS[1]!

const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
const WEEK_MS = WEEK_DAYS * DAY_MS

/** The period's weeks, oldest first, the last ending now: each one's start and its label ("5 Aug"). */
export function periodWeeks(now: number, period: Period): { start: number; label: string }[] {
  const weeks = periodOf(period).days / WEEK_DAYS
  return Array.from({ length: weeks }, (_, i) => {
    const start = now - (weeks - i) * WEEK_MS
    return { start, label: dayMonth.format(start + DAY_MS) }
  })
}

/** Which week of the period a moment falls in, or -1 outside it. */
function weekIndex(weeks: readonly { start: number }[], at: number): number {
  for (let i = weeks.length - 1; i >= 0; i--) if (at > weeks[i]!.start) return i
  return -1
}

/** A set with the workout it was in, for the best sets' table. */
export type DatedSet = SetView & { workout: WorkoutView }

/** An Exercise's sets in each finished workout, with the Current set it started at. */
export function exerciseHistory(
  gym: GymData,
  exerciseId: string,
): (ExerciseWorkout<DatedSet> & { current: { weightGrams: number; reps: number } })[] {
  return gym.workouts.flatMap((w) => {
    if (w.stage !== 'complete' || !w.endedAt) return []
    const entries = w.session.filter((e) => e.exercise?.item.id === exerciseId && e.sets.length)
    if (!entries.length) return []
    return [
      {
        workoutId: w.item.id,
        endedAt: Date.parse(w.endedAt),
        sets: entries.flatMap((e) => e.sets.map((s) => ({ ...s, workout: w }))),
        current: entries[0]!.current,
      },
    ]
  })
}

/** Stalled (GYM-014 5): every Exercise's mark, by id. */
export function stalledExercises(gym: GymData): Set<string> {
  const out = new Set<string>()
  for (const x of gym.exercises) {
    const points = bestByWorkout(exerciseHistory(gym, x.item.id))
    if (stalled(points, gym.settings.workoutsToStall)) out.add(x.item.id)
  }
  return out
}

export interface ExerciseProgression {
  weeks: string[]
  /** Best strength in each week, and the Current set's strength (GYM-014 1). */
  best: (number | null)[]
  current: (number | null)[]
  /** The week of the PR, if it is in the period. */
  prWeek: number | undefined
  /** Its primary group's stimulus sets a week, and the group's weekly target (GYM-014 2). */
  bars: number[]
  target: number
  muscle: string | undefined
  change: { change: number; percent: number; trend: Trend } | null
  /** The best set of each of its last ten workouts, newest first (GYM-014 4). */
  lastTen: BestPoint<DatedSet>[]
  stalled: boolean
}

/** An Exercise's progression over a period (GYM-014). */
export function exerciseProgression(
  gym: GymData,
  exerciseId: string,
  period: Period,
  now: number,
): ExerciseProgression {
  const exercise = gym.exercises.find((x) => x.item.id === exerciseId)
  const history = exerciseHistory(gym, exerciseId)
  const points = bestByWorkout(history)
  const weeks = periodWeeks(now, period)
  const from = weeks[0]!.start
  const shown = inPeriod(points, from)
  const best: (number | null)[] = weeks.map(() => null)
  for (const p of shown) {
    const i = weekIndex(weeks, p.endedAt)
    if (i >= 0) best[i] = Math.max(best[i] ?? 0, p.strength)
  }
  // The Current set each workout started at, carried on to the next.
  const rir = gym.settings.preferredRir
  const started = history
    .map((h) => ({ at: h.endedAt, strength: currentStrength(h.current, rir) }))
    .sort((a, b) => a.at - b.at)
  const now_ = exercise
    ? currentStrength({ weightGrams: exercise.weightGrams, reps: exercise.reps }, rir)
    : null
  let carried = [...started].reverse().find((s) => s.at <= from)?.strength ?? null
  const current = weeks.map((w, i) => {
    const end = weeks[i + 1]?.start ?? now
    for (const s of started) if (s.at > w.start && s.at <= end) carried = s.strength
    return i === weeks.length - 1 ? (now_ ?? carried) : carried
  })
  const pr = exercise?.pr
  const prWeek = pr && pr.at >= from ? weekIndex(weeks, pr.at) : undefined
  const primary = exercise?.primary
  const stimulus = stimulusByWorkout(engineWorkouts(gym), gym.exerciseMuscles)
  const t = trend(shown)
  return {
    weeks: weeks.map((w) => w.label),
    best,
    current,
    prWeek: prWeek !== undefined && prWeek >= 0 ? prWeek : undefined,
    bars: primary
      ? weeklyStimulus(stimulus, primary.id, from, now).map((b) => Math.round(b.stimulus * 10) / 10)
      : weeks.map(() => 0),
    target: primary?.stimulusTarget ?? 0,
    muscle: primary?.name,
    change: t && {
      ...t,
      percent: shown[0]!.strength > 0 ? (t.change / shown[0]!.strength) * 100 : 0,
    },
    lastTen: lastWorkouts(points),
    stalled: stalled(points, gym.settings.workoutsToStall),
  }
}

export interface MuscleLine {
  exerciseId: string
  name: string
  primary: boolean
  contribution: number
  sets: number
  /** Change in best strength from its first point in the period, % a week. */
  values: (number | null)[]
  trend: Trend | null
}

export interface MuscleProgression {
  weeks: string[]
  lines: MuscleLine[]
  /** The lines to start with (GYM-015 5). */
  start: string[]
  bars: number[]
  target: number
  /** Over the period: stimulus sets and workouts a week, and its primary exercises rising. */
  stimulusAWeek: number
  workoutsAWeek: number
  rising: { of: number; count: number }
}

/** A muscle group's progression over a period (GYM-015). */
export function muscleProgression(
  gym: GymData,
  muscleId: string,
  period: Period,
  now: number,
): MuscleProgression {
  const muscle = gym.muscles.find((m) => m.id === muscleId)
  const weeks = periodWeeks(now, period)
  const from = weeks[0]!.start
  const lines: MuscleLine[] = []
  for (const x of gym.exercises) {
    const share = (gym.exerciseMuscles.get(x.item.id) ?? []).find((s) => s.muscleId === muscleId)
    if (!share) continue
    const history = exerciseHistory(gym, x.item.id)
    const shown = inPeriod(bestByWorkout(history), from)
    const values: (number | null)[] = weeks.map(() => null)
    for (const p of relativeChange(shown)) {
      const i = weekIndex(weeks, p.endedAt)
      if (i >= 0) values[i] = Math.round(p.change * 10) / 10
    }
    lines.push({
      exerciseId: x.item.id,
      name: x.item.title,
      primary: share.contribution >= 1,
      contribution: share.contribution,
      sets: history.filter((h) => h.endedAt >= from).reduce((n, h) => n + h.sets.length, 0),
      values,
      trend: trend(shown)?.trend ?? null,
    })
  }
  // Primary first, then secondary; within each, by sets in the period, then name.
  lines.sort(
    (a, b) =>
      Number(b.primary) - Number(a.primary) || b.sets - a.sets || a.name.localeCompare(b.name),
  )
  const candidates: LineCandidate[] = lines.map((l) => ({
    exerciseId: l.exerciseId,
    primary: l.primary,
    sets: l.sets,
    name: l.name,
  }))
  const stimulus = stimulusByWorkout(engineWorkouts(gym), gym.exerciseMuscles)
  const bars = weeklyStimulus(stimulus, muscleId, from, now).map(
    (b) => Math.round(b.stimulus * 10) / 10,
  )
  const trained = stimulus.filter(
    (w) => w.endedAt > from && w.endedAt <= now && trains(w.stimulus.get(muscleId) ?? 0),
  ).length
  const primaries = lines.filter((l) => l.primary && l.trend !== null)
  return {
    weeks: weeks.map((w) => w.label),
    lines,
    start: defaultLines(candidates),
    bars,
    target: muscle?.stimulusTarget ?? 0,
    stimulusAWeek: bars.reduce((n, b) => n + b, 0) / weeks.length,
    workoutsAWeek: trained / weeks.length,
    rising: { of: primaries.length, count: primaries.filter((l) => l.trend === 'rising').length },
  }
}
