import {
  averageFrequency,
  coverage,
  fullyRecoveredAt,
  lastTrained,
  overallReadiness,
  rankTemplates,
  readinessAt,
  replay,
  stimulusByWorkout,
  weekOf,
  type EngineWorkout,
  type MuscleState,
  type RankedTemplate,
  type WorkoutStimulus,
} from '@lifeos/fitness'
import { useMemo } from 'react'
import type { GymData, MuscleView, TemplateView } from '@/data'

/** A muscle group as Recovery shows it (GYM-016, GYM-017). */
export interface MuscleRecovery {
  muscle: MuscleView
  state: MuscleState | undefined
  /** When it was last trained (0.5 stimulus sets or more), ms; null if never. */
  lastTrained: number | null
  /** Workouts a week that trained it, over the last 28 days. */
  frequency: number
  /** The last seven days: its stimulus sets, and the workouts that trained it. */
  week: { stimulus: number; frequency: number }
}

export interface Recovery {
  /** When it was worked out, ms. */
  now: number
  muscles: MuscleRecovery[]
  /** Overall readiness at a time: the groups with a weekly target above zero. */
  overallAt: (at: number) => number
  /** The template that suits me best now, if any (GYM-018). */
  suggestion: (RankedTemplate & { template: TemplateView }) | null
}

/** Finished workouts as the engine takes them: when each ended, and its sets. */
export function engineWorkouts(gym: GymData): EngineWorkout[] {
  return gym.workouts.flatMap((w) =>
    w.stage === 'complete' && w.endedAt
      ? [
          {
            id: w.item.id,
            endedAt: Date.parse(w.endedAt),
            sets: w.session.flatMap((e) =>
              e.exercise
                ? e.sets.map((s) => ({ exerciseId: e.exercise!.item.id, reps: s.reps, rir: s.rir }))
                : [],
            ),
          },
        ]
      : [],
  )
}

/**
 * Recovery from my workouts (GYM-016–018; ADR-0059): the engine replays the
 * last 60 days' finished workouts on the device, so readiness follows a
 * workout finished, edited or deleted at once, offline too.
 */
export function recoveryOf(gym: GymData, now: number): Recovery {
  const workouts = engineWorkouts(gym)
  const context = {
    muscles: gym.exerciseMuscles,
    recoveryTypes: new Map(gym.muscles.map((m) => [m.id, m.recoveryType])),
    settings: {
      pointsPerFatigueSet: gym.settings.pointsPerFatigueSet,
      recoveryHours: {
        fast: gym.settings.tFastH,
        normal: gym.settings.tNormalH,
        slow: gym.settings.tSlowH,
      },
    },
  }
  const states = replay(workouts, context, now)
  const stimulus: WorkoutStimulus[] = stimulusByWorkout(workouts, gym.exerciseMuscles)
  const muscles = gym.muscles.map((muscle) => ({
    muscle,
    state: states.get(muscle.id),
    lastTrained: lastTrained(stimulus, muscle.id, now),
    frequency: averageFrequency(stimulus, muscle.id, now),
    week: weekOf(stimulus, muscle.id, now),
  }))
  const targeted = gym.muscles
    .filter((m) => m.frequencyTarget > 0 || m.stimulusTarget > 0)
    .map((m) => m.id)
  const byId = new Map(muscles.map((m) => [m.muscle.id, m]))
  const ranked = rankTemplates(
    gym.templates.map((t) => ({
      id: t.item.id,
      name: t.item.title,
      coverage: coverage(
        t.lines.flatMap((l) =>
          l.exercise && !l.exercise.archived
            ? [{ exerciseId: l.exercise.item.id, sets: l.sets }]
            : [],
        ),
        gym.exerciseMuscles,
        gym.settings.preferredRir,
      ),
    })),
    (id) => {
      const m = byId.get(id)
      return {
        readiness: readinessAt(m?.state, now),
        lastTrained: m?.lastTrained ?? null,
        frequencyTarget: m?.muscle.frequencyTarget ?? 0,
      }
    },
    now,
  )
  const best = ranked[0]
  const template = best && gym.templates.find((t) => t.item.id === best.id)
  return {
    now,
    muscles,
    overallAt: (at) => overallReadiness(states, targeted, at),
    suggestion: best && template ? { ...best, template } : null,
  }
}

export function useRecovery(gym: GymData, now: number): Recovery {
  return useMemo(() => recoveryOf(gym, now), [gym, now])
}

/** Readiness as a whole percentage, as it is shown. */
export const percent = (readiness: number) => Math.round(readiness)

/** When it is fully recovered, if it isn't yet at `at`. */
export const recoveredBy = (m: MuscleRecovery, at: number) => fullyRecoveredAt(m.state, at)
