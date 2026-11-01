import {
  personalRecord,
  setStrength,
  toGrams,
  type ExerciseMuscles,
  type MuscleShare,
  type WorkoutStage,
} from '@lifeos/fitness'
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
  applyPendingEntries,
  applyPendingSets,
  applyPendingWorkouts,
  entriesKey,
  fetchEntries,
  fetchSets,
  fetchWorkouts,
  setsKey,
  workoutsKey,
  type GymSettings,
  type MuscleView,
} from './fitness'
import { useItems, useLinks, useQueueEntries } from './hooks'
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
  /** When a workout last had sets of it (ms); null if never (GYM-003 1). */
  lastDone: number | null
  /** Its PR (GYM-012 3): the set with the best strength, the first to reach it. */
  pr: { set: SetView; strength: number; at: number } | null
}

/** A logged set (GYM-010), weight in whole grams; a quick set has none of the three. */
export interface SetView {
  id: string
  position: string
  weightGrams: number | null
  reps: number | null
  rir: number | null
  loggedAt: string
  strength: number | null
  /** The exercise's PR (GYM-010 6). */
  pr: boolean
  workoutId: string
}

/** One of a workout's exercises (GYM-008): in the backlog or the session. */
export interface EntryView {
  id: string
  workoutId: string
  exercise: ExerciseView | undefined
  /** As it was when it joined the workout (ADR-0013), else the Exercise as it is. */
  name: string
  current: { weightGrams: number; reps: number }
  place: 'backlog' | 'session'
  position: string
  plannedSets: number
  begunAt: string | null
  doneAt: string | null
  sets: SetView[]
}

/** A Workout (GYM-007–GYM-012). */
export interface WorkoutView {
  item: Item
  stage: WorkoutStage
  startedAt: string | null
  endedAt: string | null
  howItWent: number | null
  motivation: number | null
  notes: string | null
  /** The template it follows, if any. */
  templateId: string | null
  /** The session in the order begun, then the backlog in its order. */
  session: EntryView[]
  backlog: EntryView[]
  /** Its sets, every one (GYM-013). */
  setCount: number
}

/** A Workout template (GYM-006): its exercises in order, each with its number of sets. */
export interface TemplateView {
  item: Item
  lines: { id: string; position: string; sets: number; exercise: ExerciseView | undefined }[]
  /** Its exercises and sets, together. */
  exerciseCount: number
  setCount: number
  /** When a workout last followed it; null if never. */
  lastUsed: number | null
  /** When each workout that followed it was used, ms (GYM-022 2's uses over the last month). */
  uses: number[]
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
  /** My workouts, newest day first. */
  workouts: WorkoutView[]
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
  const workoutRows = useQuery({ queryKey: workoutsKey, queryFn: fetchWorkouts })
  const entryRows = useQuery({ queryKey: entriesKey, queryFn: fetchEntries })
  const setRows = useQuery({ queryKey: setsKey, queryFn: fetchSets })
  const links = useLinks(queue)

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
        lastDone: null,
        pr: null,
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
          lastUsed: null as number | null,
          uses: [] as number[],
        }
      })
      .sort((a, b) => a.item.title.localeCompare(b.item.title))

    // Workouts, their entries and sets (GYM-007–GYM-012).
    const follows = new Map(
      links.filter((l) => l.link_type === 'follows').map((l) => [l.from_item, l.to_item]),
    )
    const detail = new Map(
      applyPendingWorkouts(workoutRows.data ?? [], entries).map((w) => [w.item_id, w]),
    )
    const setsBy = new Map<string, ReturnType<typeof applyPendingSets>>()
    for (const s of applyPendingSets(setRows.data ?? [], entries)) {
      const list = setsBy.get(s.entry_id) ?? []
      list.push(s)
      setsBy.set(s.entry_id, list)
    }
    const workoutItems = items.filter((i) => i.type === 'workout')
    const liveWorkout = new Set(workoutItems.map((i) => i.id))
    const entriesBy = new Map<string, EntryView[]>()
    for (const e of applyPendingEntries(entryRows.data ?? [], entries)) {
      if (!liveWorkout.has(e.workout_id)) continue
      const exercise = viewById.get(e.exercise_id)
      const snap = (e.snapshot ?? {}) as Record<string, unknown>
      const view: EntryView = {
        id: e.id,
        workoutId: e.workout_id,
        exercise,
        name: typeof snap.name === 'string' ? snap.name : (exercise?.item.title ?? 'Exercise'),
        current:
          snap.current_weight !== undefined && snap.current_weight !== null
            ? {
                weightGrams: toGrams(snap.current_weight as number),
                reps: Number(snap.current_reps),
              }
            : { weightGrams: exercise?.weightGrams ?? 0, reps: exercise?.reps ?? 8 },
        place: e.place === 'session' ? 'session' : 'backlog',
        position: e.position,
        plannedSets: e.planned_sets,
        begunAt: e.begun_at,
        doneAt: e.done_at,
        sets: (setsBy.get(e.id) ?? []).map((s) => {
          const set = {
            weightGrams: s.weight === null ? null : toGrams(s.weight),
            reps: s.reps,
            rir: s.rir,
          }
          return {
            id: s.id,
            position: s.position,
            ...set,
            loggedAt: s.logged_at,
            strength: setStrength(set),
            pr: false,
            workoutId: e.workout_id,
          }
        }),
      }
      const list = entriesBy.get(e.workout_id) ?? []
      list.push(view)
      entriesBy.set(e.workout_id, list)
    }
    const workouts: WorkoutView[] = workoutItems
      .map((item) => {
        const w = detail.get(item.id)
        const all = entriesBy.get(item.id) ?? []
        const session = all
          .filter((e) => e.place === 'session')
          .sort(
            (a, b) => (a.begunAt ?? '').localeCompare(b.begunAt ?? '') || (a.id < b.id ? -1 : 1),
          )
        const backlog = all
          .filter((e) => e.place === 'backlog')
          .sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0))
        return {
          item,
          stage: (w?.stage ?? 'planned') as WorkoutStage,
          startedAt: w?.started_at ?? null,
          endedAt: w?.ended_at ?? null,
          howItWent: w?.how_it_went ?? null,
          motivation: w?.motivation ?? null,
          notes: w?.notes ?? null,
          templateId: follows.get(item.id) ?? null,
          session,
          backlog,
          setCount: session.reduce((n, e) => n + e.sets.length, 0),
        }
      })
      .sort(
        (a, b) =>
          (b.item.do_on ?? '').localeCompare(a.item.do_on ?? '') ||
          (b.startedAt ?? '').localeCompare(a.startedAt ?? ''),
      )

    // An Exercise's last done and PR; a template's last use (GYM-003 1, GYM-010 6, GYM-022).
    const setsOf = new Map<string, (SetView & { at: number })[]>()
    for (const w of workouts) {
      if (w.stage === 'planned') continue
      for (const e of w.session) {
        if (!e.exercise || !e.sets.length) continue
        const id = e.exercise.item.id
        const when = Date.parse(w.endedAt ?? w.startedAt ?? w.item.created_at)
        if ((e.exercise.lastDone ?? 0) < when) e.exercise.lastDone = when
        const list = setsOf.get(id) ?? []
        for (const s of e.sets) list.push({ ...s, at: Date.parse(s.loggedAt) })
        setsOf.set(id, list)
      }
      const t = w.templateId ? templates.find((x) => x.item.id === w.templateId) : undefined
      const used = Date.parse(w.startedAt ?? w.item.created_at)
      if (t && (t.lastUsed ?? 0) < used) t.lastUsed = used
      t?.uses.push(used)
    }
    const prIds = new Set<string>()
    for (const [id, list] of setsOf) {
      const best = personalRecord(list)
      const x = viewById.get(id)
      if (!best || !x) continue
      x.pr = { set: best.set, strength: best.strength, at: best.set.at }
      prIds.add(best.set.id)
    }
    for (const w of workouts)
      for (const e of w.session) for (const s of e.sets) s.pr = prIds.has(s.id)
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
      workouts,
      isLoading:
        itemsLoading ||
        equipment.isLoading ||
        groups.isLoading ||
        exercises.isLoading ||
        exerciseMuscles.isLoading ||
        templateLines.isLoading ||
        workoutRows.isLoading ||
        entryRows.isLoading ||
        setRows.isLoading,
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
    workoutRows.data,
    workoutRows.isLoading,
    entryRows.data,
    entryRows.isLoading,
    setRows.data,
    setRows.isLoading,
    links,
  ])
}
