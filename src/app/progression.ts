import {
  availableWeeks,
  bestByWorkout,
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
  type WorkoutStimulus,
} from '@lifeos/fitness'
import type { GymData, SetView, WorkoutView } from '@/data'
import { engineWorkouts, firstWorkoutAt } from './recovery'

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

/** A chart's weeks, oldest first, the last ending now: each one's start and its label ("5 Aug"). */
export function weeksTo(now: number, count: number): { start: number; label: string }[] {
  return Array.from({ length: count }, (_, i) => {
    const start = now - (count - i) * WEEK_MS
    return { start, label: dayMonth.format(start + DAY_MS) }
  })
}

/** The period's weeks, oldest first, the last ending now. */
export function periodWeeks(now: number, period: Period): { start: number; label: string }[] {
  return weeksTo(now, periodOf(period).days / WEEK_DAYS)
}

/**
 * What a chart spans: the period, or — when what it shows began within it —
 * the whole weeks from the first of it to now, a week at least (Joe, 3
 * November: three weeks of an exercise show three weeks, not three months).
 */
export interface ChartSpan {
  from: number
  to: number
  weeks: { start: number; label: string }[]
  /** "3 months"; "3 weeks" when it began within the period. */
  name: string
}

export function chartSpan(now: number, period: Period, first: number | null): ChartSpan {
  const max = periodOf(period).days / WEEK_DAYS
  const count =
    first === null || first <= now - max * WEEK_MS
      ? max
      : Math.min(max, Math.floor((now - first) / WEEK_MS) + 1)
  const weeks = weeksTo(now, count)
  return {
    from: weeks[0]!.start,
    to: now,
    weeks,
    name: count === max ? periodOf(period).name : count === 1 ? '1 week' : `${count} weeks`,
  }
}

/** A week's bar: its start, label and stimulus sets. */
export interface ChartWeek {
  start: number
  label: string
  value: number
}

/** Stimulus sets a week, as the bars under a chart show them, over its span. */
function barsOf(
  stimulus: readonly WorkoutStimulus[],
  muscleId: string | undefined,
  span: ChartSpan,
): ChartWeek[] {
  const values = muscleId
    ? weeklyStimulus(stimulus, muscleId, span.from, span.to).map((b) => b.stimulus)
    : span.weeks.map(() => 0)
  return span.weeks.map((w, i) => ({ ...w, value: Math.round((values[i] ?? 0) * 10) / 10 }))
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

/** An Exercise's strongest set in one workout, as its chart shows it (GYM-014 1). */
export interface ExercisePoint {
  workoutId: string
  at: number
  title: string
  weightGrams: number
  reps: number
  rir: number
  pr: boolean
}

export interface ExerciseProgression {
  span: ChartSpan
  /** The strongest set of each workout in the span, oldest first: its weight, with its reps. */
  points: ExercisePoint[]
  /** Its primary group's stimulus sets a week, and the group's weekly target (GYM-014 2). */
  bars: ChartWeek[]
  target: number
  muscle: string | undefined
  /** Best strength over the span, first workout to last, in %. */
  change: { change: number; percent: number; trend: Trend } | null
  /** The best set of each of its last ten workouts, newest first (GYM-014 4). */
  lastTen: BestPoint<DatedSet>[]
  stalled: boolean
}

/** An Exercise's progression over a period, or since it was first done (GYM-014). */
export function exerciseProgression(
  gym: GymData,
  exerciseId: string,
  period: Period,
  now: number,
): ExerciseProgression {
  const exercise = gym.exercises.find((x) => x.item.id === exerciseId)
  const history = exerciseHistory(gym, exerciseId)
  const points = bestByWorkout(history)
  const span = chartSpan(now, period, points[0]?.endedAt ?? null)
  const shown = inPeriod(points, span.from)
  const primary = exercise?.primary
  const stimulus = stimulusByWorkout(engineWorkouts(gym), gym.exerciseMuscles)
  const t = trend(shown)
  return {
    span,
    points: shown.map((p) => ({
      workoutId: p.workoutId,
      at: p.endedAt,
      title: p.set.workout.item.title,
      weightGrams: p.set.weightGrams ?? 0,
      reps: p.set.reps ?? 0,
      rir: p.set.rir ?? 0,
      pr: p.set.pr,
    })),
    bars: barsOf(stimulus, primary?.id, span),
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
  /** Each workout's change in best strength from its first in the span, %, oldest first. */
  points: { workoutId: string; at: number; title: string; value: number }[]
  trend: Trend | null
}

export interface MuscleProgression {
  span: ChartSpan
  lines: MuscleLine[]
  /** The lines to start with (GYM-015 5). */
  start: string[]
  bars: ChartWeek[]
  target: number
  /**
   * Over the period, or the weeks since my first workout when fewer: stimulus
   * sets and workouts a week, and its primary exercises rising.
   */
  stimulusAWeek: number
  workoutsAWeek: number
  rising: { of: number; count: number }
}

/** A muscle group's progression over a period, or since it was first trained (GYM-015). */
export function muscleProgression(
  gym: GymData,
  muscleId: string,
  period: Period,
  now: number,
): MuscleProgression {
  const muscle = gym.muscles.find((m) => m.id === muscleId)
  const workouts = engineWorkouts(gym)
  const stimulus = stimulusByWorkout(workouts, gym.exerciseMuscles)
  const histories = gym.exercises.flatMap((x) => {
    const share = (gym.exerciseMuscles.get(x.item.id) ?? []).find((s) => s.muscleId === muscleId)
    return share ? [{ x, share, history: exerciseHistory(gym, x.item.id) }] : []
  })
  const first = firstWorkoutAt([
    ...stimulus.filter((w) => trains(w.stimulus.get(muscleId) ?? 0)),
    ...histories.flatMap((h) => h.history),
  ])
  const span = chartSpan(now, period, first)
  const lines: MuscleLine[] = histories.map(({ x, share, history }) => {
    const shown = inPeriod(bestByWorkout(history), span.from)
    const changes = relativeChange(shown)
    return {
      exerciseId: x.item.id,
      name: x.item.title,
      primary: share.contribution >= 1,
      contribution: share.contribution,
      sets: history.filter((h) => h.endedAt >= span.from).reduce((n, h) => n + h.sets.length, 0),
      points: shown.map((p, i) => ({
        workoutId: p.workoutId,
        at: p.endedAt,
        title: p.set.workout.item.title,
        value: Math.round((changes[i]?.change ?? 0) * 10) / 10,
      })),
      trend: trend(shown)?.trend ?? null,
    }
  })
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
  // Averages over the period, or the whole weeks since my first workout (Joe, 3 November).
  const max = periodOf(period).days / WEEK_DAYS
  const weeks = availableWeeks(firstWorkoutAt(workouts), now, max)
  const inWindow = stimulus.filter((w) => w.endedAt > now - max * WEEK_MS && w.endedAt <= now)
  const primaries = lines.filter((l) => l.primary && l.trend !== null)
  return {
    span,
    lines,
    start: defaultLines(candidates),
    bars: barsOf(stimulus, muscleId, span),
    target: muscle?.stimulusTarget ?? 0,
    stimulusAWeek: inWindow.reduce((n, w) => n + (w.stimulus.get(muscleId) ?? 0), 0) / weeks,
    workoutsAWeek: inWindow.filter((w) => trains(w.stimulus.get(muscleId) ?? 0)).length / weeks,
    rising: { of: primaries.length, count: primaries.filter((l) => l.trend === 'rising').length },
  }
}
