import { stimulusSets } from '@lifeos/fitness'
import { useMemo, useState } from 'react'
import type { GymData, WorkoutView } from '@/data'
import { fromIsoDay, shortDate } from '@/lib/dates'
import {
  counted,
  NO_WORKOUT_FILTER,
  pillState,
  type WorkoutFilter,
  type WorkoutListRow,
} from '@/lib/gym'

export type WorkoutRow = WorkoutListRow & { view: WorkoutView }

/** Every workout as All workouts filters, sorts and averages it (GYM-013). */
export function useWorkoutRows(gym: GymData, today: string): WorkoutRow[] {
  return useMemo(
    () =>
      gym.workouts.map((w) => {
        const done = w.session.filter((e) => e.sets.length > 0)
        const stimulus = stimulusSets(
          done.flatMap((e) =>
            e.exercise
              ? e.sets.map((s) => ({ exerciseId: e.exercise!.item.id, reps: s.reps, rir: s.rir }))
              : [],
          ),
          gym.exerciseMuscles,
        )
        const total = [...stimulus.values()].reduce((n, s) => n + s, 0)
        return {
          id: w.item.id,
          name: w.item.title,
          day: w.item.do_on ?? w.item.created_at.slice(0, 10),
          state: pillState(w.stage, w.item.do_on, today),
          templateId: w.templateId,
          exerciseIds: done.flatMap((e) => (e.exercise ? [e.exercise.item.id] : [])),
          muscleIds: [...stimulus].filter(([, s]) => s > 0).map(([m]) => m),
          sets: w.setCount,
          stimulus: Math.round(total * 10) / 10,
          exercisesDone: done.length,
          minutes:
            w.startedAt && w.endedAt
              ? Math.round((Date.parse(w.endedAt) - Date.parse(w.startedAt)) / 60_000)
              : null,
          howItWent: w.howItWent,
          motivation: w.motivation,
          startedAt: w.startedAt ? Date.parse(w.startedAt) : null,
          view: w,
        }
      }),
    [gym.workouts, gym.exerciseMuscles, today],
  )
}

const KEY = 'lifeos.gym.workouts'
const DEFAULT: WorkoutFilter = { ...NO_WORKOUT_FILTER, sort: 'date', direction: 'desc' }

function read(): WorkoutFilter {
  try {
    return {
      ...DEFAULT,
      ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<WorkoutFilter>),
    }
  } catch {
    return DEFAULT
  }
}

/** All workouts' filters and sort, kept for next time on this device (GYM-013 3, 4). */
export function useWorkoutFilter() {
  const [filter, setFilter] = useState(read)
  const change = (patch: Partial<WorkoutFilter>) =>
    setFilter((f) => {
      const next = { ...f, ...patch }
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        // Kept for this visit only.
      }
      return next
    })
  const reset = () => change(NO_WORKOUT_FILTER)
  return { filter, change, reset }
}

/** "Mon 28 Oct · 6 exercises · 17 sets" (GYM-013 1). */
export function workoutMeta(w: WorkoutView, phone: boolean): string[] {
  const exercises = w.session.filter((e) => e.sets.length > 0).length
  return [
    w.item.do_on ? shortDate(fromIsoDay(w.item.do_on)) : '',
    ...(w.stage === 'planned'
      ? []
      : [...(phone ? [] : [counted(exercises, 'exercise')]), counted(w.setCount, 'set')]),
  ].filter(Boolean)
}
