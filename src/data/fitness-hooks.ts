import { toGrams, type ExerciseMuscles, type MuscleShare } from '@lifeos/fitness'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useAuth } from './auth'
import {
  applyPendingEquipment,
  applyPendingExerciseMuscles,
  applyPendingExercises,
  applyPendingGymSettings,
  applyPendingMuscleGroups,
  applyPendingMuscleSettings,
  DEFAULT_GYM_SETTINGS,
  equipmentKey,
  exerciseMusclesKey,
  exercisesKey,
  fetchEquipment,
  fetchExerciseMuscles,
  fetchExercises,
  fetchGymSettings,
  fetchMuscleGroups,
  fetchMuscleSettings,
  gymSettingsKey,
  muscleGroupsKey,
  muscleSettingsKey,
  muscleViews,
  applyPendingTemplateLines,
  fetchTemplateLines,
  templateLinesKey,
  type GymSettings,
  type MuscleView,
} from './fitness'
import { useItems, useQueueEntries } from './hooks'
import type { WriteQueue } from './queue/queue'
import type { Item } from './types'

/** A piece of equipment, its increment in whole grams. */
export interface EquipmentView {
  id: string
  name: string
  incrementGrams: number
}

/** An Exercise as the Gym shows it (GYM-004). */
export interface ExerciseView {
  item: Item
  equipment: EquipmentView | undefined
  /** Its Current set (GYM-004 1), weight in whole grams. */
  weightGrams: number
  reps: number
  notes: string | null
  primary: MuscleView | undefined
  /** Its secondary groups, the largest share first. */
  secondaries: { muscle: MuscleView; contribution: number }[]
  /** Archived (GYM-005): out of the library, pickers and swaps. */
  archived: boolean
}

/** A Workout template (GYM-006): its exercises in order, each with its number of sets. */
export interface TemplateView {
  item: Item
  lines: { id: string; position: string; sets: number; exercise: ExerciseView | undefined }[]
  /** Its exercises and sets, together. */
  exerciseCount: number
  setCount: number
  /** When a workout last followed it; null if never (workouts come with plan step 8). */
  lastUsed: number | null
}

export interface GymData {
  equipment: EquipmentView[]
  /** Every group, by category: built in first, then mine. */
  muscles: MuscleView[]
  muscleById: ReadonlyMap<string, MuscleView>
  settings: GymSettings
  /** Every Exercise of mine, archived ones included, A–Z. */
  exercises: ExerciseView[]
  /** The equipment and groups an Exercise uses, which can't be removed (GYM-001 4, GYM-002 2). */
  equipmentInUse: ReadonlySet<string>
  musclesInUse: ReadonlySet<string>
  /** Each Exercise's groups and shares, as the recovery engine and coverage read them. */
  exerciseMuscles: ExerciseMuscles
  /** My templates, A–Z. */
  templates: TemplateView[]
  isLoading: boolean
}

/** The Gym's reference data, settings and Exercises, with unsent changes laid over (OFF-001). */
export function useGym(queue: WriteQueue): GymData {
  const auth = useAuth()
  const me = auth.status === 'signed-in' ? auth.me.id : ''
  const entries = useQueueEntries(queue)
  const { items, isLoading: itemsLoading } = useItems(queue)
  const equipment = useQuery({ queryKey: equipmentKey, queryFn: fetchEquipment })
  const groups = useQuery({ queryKey: muscleGroupsKey, queryFn: fetchMuscleGroups })
  const muscleSettings = useQuery({ queryKey: muscleSettingsKey, queryFn: fetchMuscleSettings })
  const settings = useQuery({ queryKey: gymSettingsKey, queryFn: fetchGymSettings })
  const exercises = useQuery({ queryKey: exercisesKey, queryFn: fetchExercises })
  const exerciseMuscles = useQuery({ queryKey: exerciseMusclesKey, queryFn: fetchExerciseMuscles })
  const templateLines = useQuery({ queryKey: templateLinesKey, queryFn: fetchTemplateLines })

  return useMemo(() => {
    const kit = applyPendingEquipment(equipment.data ?? [], entries).map((e) => ({
      id: e.id,
      name: e.name,
      incrementGrams: toGrams(e.increment),
    }))
    const kitById = new Map(kit.map((k) => [k.id, k]))
    const muscles = muscleViews(
      applyPendingMuscleGroups(groups.data ?? [], entries, me),
      applyPendingMuscleSettings(muscleSettings.data ?? [], entries),
    )
    const muscleById = new Map(muscles.map((m) => [m.id, m]))
    const rows = new Map(
      applyPendingExercises(exercises.data ?? [], entries).map((r) => [r.item_id, r]),
    )
    const shares = applyPendingExerciseMuscles(exerciseMuscles.data ?? [], entries)
    const views: ExerciseView[] = []
    for (const item of items) {
      if (item.type !== 'exercise') continue
      const row = rows.get(item.id)
      const mine = shares.filter((s) => s.exercise_id === item.id)
      const primary = mine.find((s) => Number(s.contribution) >= 1)
      views.push({
        item,
        equipment: row?.equipment_id ? kitById.get(row.equipment_id) : undefined,
        weightGrams: toGrams(row?.current_weight ?? 0),
        reps: row?.current_reps ?? 8,
        notes: row?.notes ?? null,
        primary: primary ? muscleById.get(primary.muscle_id) : undefined,
        secondaries: mine
          .filter((s) => Number(s.contribution) < 1)
          .flatMap((s) => {
            const muscle = muscleById.get(s.muscle_id)
            return muscle ? [{ muscle, contribution: Number(s.contribution) }] : []
          })
          .sort(
            (a, b) => b.contribution - a.contribution || a.muscle.name.localeCompare(b.muscle.name),
          ),
        archived: item.status === 'cancelled',
      })
    }
    views.sort((a, b) => a.item.title.localeCompare(b.item.title))
    const viewById = new Map(views.map((v) => [v.item.id, v]))
    const linesBy = new Map<string, TemplateView['lines']>()
    for (const l of applyPendingTemplateLines(templateLines.data ?? [], entries)) {
      const list = linesBy.get(l.template_id) ?? []
      list.push({
        id: l.id,
        position: l.position,
        sets: l.sets,
        exercise: viewById.get(l.exercise_id),
      })
      linesBy.set(l.template_id, list)
    }
    const templates: TemplateView[] = items
      .filter((i) => i.type === 'workout_template')
      .map((item) => {
        const lines = linesBy.get(item.id) ?? []
        return {
          item,
          lines,
          exerciseCount: lines.length,
          setCount: lines.reduce((n, l) => n + l.sets, 0),
          lastUsed: null,
        }
      })
      .sort((a, b) => a.item.title.localeCompare(b.item.title))
    const exerciseMusclesMap = new Map<string, MuscleShare[]>(
      views.map((v) => [
        v.item.id,
        [
          ...(v.primary ? [{ muscleId: v.primary.id, contribution: 1 }] : []),
          ...v.secondaries.map((s) => ({ muscleId: s.muscle.id, contribution: s.contribution })),
        ],
      ]),
    )
    return {
      equipment: kit,
      muscles,
      muscleById,
      settings: applyPendingGymSettings(settings.data ?? DEFAULT_GYM_SETTINGS, entries),
      exercises: views,
      equipmentInUse: new Set(
        [...rows.values()].flatMap((r) => (r.equipment_id ? [r.equipment_id] : [])),
      ),
      musclesInUse: new Set(shares.map((s) => s.muscle_id)),
      exerciseMuscles: exerciseMusclesMap,
      templates,
      isLoading:
        itemsLoading ||
        equipment.isLoading ||
        groups.isLoading ||
        exercises.isLoading ||
        exerciseMuscles.isLoading ||
        templateLines.isLoading,
    }
  }, [
    me,
    entries,
    items,
    itemsLoading,
    equipment.data,
    equipment.isLoading,
    groups.data,
    groups.isLoading,
    muscleSettings.data,
    settings.data,
    exercises.data,
    exercises.isLoading,
    exerciseMuscles.data,
    exerciseMuscles.isLoading,
    templateLines.data,
    templateLines.isLoading,
  ])
}
