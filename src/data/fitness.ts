import type { RecoveryType } from '@lifeos/fitness'
import { DEFAULT_ENGINE_SETTINGS, DEFAULT_WORKOUTS_TO_STALL } from '@lifeos/fitness'
import type { Database } from './database.types'
import type { QueueEntry } from './queue/store'
import { supabase } from './supabase'

type Fitness = Database['fitness']['Tables']

/** A piece of my equipment and the step its weights go by (GYM-001). */
export type Equipment = Pick<Fitness['equipment']['Row'], 'id' | 'name' | 'increment'>
/** A muscle group: built in (no person) or mine (GYM-002). */
export type MuscleGroup = Omit<Fitness['muscle_groups']['Row'], 'created_at' | 'updated_at'>
/** My settings for a muscle group (GYM-002 3, GYM-017). */
export type MuscleSettingsRow = Omit<Fitness['muscle_settings']['Row'], 'person_id' | 'updated_at'>
/** An Exercise's own fields beyond its Item (GYM-004). */
export type ExerciseRow = Omit<Fitness['exercise']['Row'], 'updated_at'>
/** One of an Exercise's muscle groups: 1.0 primary, else a secondary's share. */
export type ExerciseMuscle = Fitness['exercise_muscles']['Row']

export type MuscleCategory = 'push' | 'pull' | 'core' | 'legs'
export const CATEGORIES: readonly { key: MuscleCategory; label: string }[] = [
  { key: 'push', label: 'Push' },
  { key: 'pull', label: 'Pull' },
  { key: 'core', label: 'Core' },
  { key: 'legs', label: 'Legs' },
]

/** My Gym settings (GYM-019 3, GYM-020). */
export interface GymSettings {
  preferredRir: number
  workoutsToStall: number
  pointsPerFatigueSet: number
  tFastH: number
  tNormalH: number
  tSlowH: number
}

/** What fitness.update_settings takes. */
export interface GymSettingsPatch {
  preferred_rir?: number
  workouts_to_stall?: number
  points_per_fatigue_set?: number
  t_fast_h?: number
  t_normal_h?: number
  t_slow_h?: number
}

/** Until mine have loaded, or when I've never changed them: the database's defaults. */
export const DEFAULT_GYM_SETTINGS: GymSettings = {
  preferredRir: 1,
  workoutsToStall: DEFAULT_WORKOUTS_TO_STALL,
  pointsPerFatigueSet: DEFAULT_ENGINE_SETTINGS.pointsPerFatigueSet,
  tFastH: DEFAULT_ENGINE_SETTINGS.recoveryHours.fast,
  tNormalH: DEFAULT_ENGINE_SETTINGS.recoveryHours.normal,
  tSlowH: DEFAULT_ENGINE_SETTINGS.recoveryHours.slow,
}

/** A group's weekly targets when I've set none (GYM-017 1). */
export const DEFAULT_FREQUENCY_TARGET = 2
export const DEFAULT_STIMULUS_TARGET = 4

export const equipmentKey = ['fitness', 'equipment'] as const
export const muscleGroupsKey = ['fitness', 'muscle_groups'] as const
export const muscleSettingsKey = ['fitness', 'muscle_settings'] as const
export const gymSettingsKey = ['fitness', 'settings'] as const
export const exercisesKey = ['fitness', 'exercise'] as const
export const exerciseMusclesKey = ['fitness', 'exercise_muscles'] as const

const fitness = () => supabase().schema('fitness')

export async function fetchEquipment(): Promise<Equipment[]> {
  const { data, error } = await fitness()
    .from('equipment')
    .select('id, name, increment')
    .order('name')
  if (error) throw error
  return data
}

export async function fetchMuscleGroups(): Promise<MuscleGroup[]> {
  const { data, error } = await fitness()
    .from('muscle_groups')
    .select('id, person_id, name, category, body_part, default_recovery, position')
    .order('position')
  if (error) throw error
  return data
}

export async function fetchMuscleSettings(): Promise<MuscleSettingsRow[]> {
  const { data, error } = await fitness()
    .from('muscle_settings')
    .select('muscle_id, recovery_type, frequency_target, stimulus_target')
  if (error) throw error
  return data
}

export async function fetchGymSettings(): Promise<GymSettings> {
  const { data, error } = await fitness()
    .from('settings')
    .select(
      'preferred_rir, workouts_to_stall, points_per_fatigue_set, t_fast_h, t_normal_h, t_slow_h',
    )
    .limit(1)
  if (error) throw error
  const s = data[0]
  if (!s) return DEFAULT_GYM_SETTINGS
  return {
    preferredRir: s.preferred_rir,
    workoutsToStall: s.workouts_to_stall,
    pointsPerFatigueSet: Number(s.points_per_fatigue_set),
    tFastH: Number(s.t_fast_h),
    tNormalH: Number(s.t_normal_h),
    tSlowH: Number(s.t_slow_h),
  }
}

export async function fetchExercises(): Promise<ExerciseRow[]> {
  const { data, error } = await fitness()
    .from('exercise')
    .select('item_id, equipment_id, current_weight, current_reps, notes')
  if (error) throw error
  return data
}

export async function fetchExerciseMuscles(): Promise<ExerciseMuscle[]> {
  const { data, error } = await fitness()
    .from('exercise_muscles')
    .select('exercise_id, muscle_id, contribution')
  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// Unsent writes laid over what the server last sent (OFF-001).

type Args = Record<string, unknown>
const args = (e: QueueEntry) => e.args as Args
const num = (v: unknown, fallback: number) => (v === undefined || v === null ? fallback : Number(v))

export function applyPendingEquipment(
  rows: readonly Equipment[],
  entries: readonly QueueEntry[],
): Equipment[] {
  const byId = new Map(rows.map((r) => [r.id, r]))
  for (const e of entries) {
    const a = args(e)
    if (e.fn === 'fitness.save_equipment') {
      const id = String(a.p_id)
      byId.set(id, { id, name: String(a.p_name).trim(), increment: Number(a.p_increment) })
    } else if (e.fn === 'fitness.remove_equipment' && e.state === 'pending') {
      byId.delete(String(a.p_id))
    }
  }
  return [...byId.values()].sort((x, y) => x.name.localeCompare(y.name))
}

export function applyPendingMuscleGroups(
  rows: readonly MuscleGroup[],
  entries: readonly QueueEntry[],
  me: string,
): MuscleGroup[] {
  const byId = new Map(rows.map((r) => [r.id, r]))
  for (const e of entries) {
    const a = args(e)
    if (e.fn === 'fitness.save_muscle_group') {
      const id = String(a.p_id)
      const old = byId.get(id)
      byId.set(id, {
        id,
        person_id: old?.person_id ?? me,
        name: String(a.p_name).trim(),
        category: String(a.p_category),
        body_part: null,
        default_recovery: old?.default_recovery ?? 'normal',
        position: old?.position ?? 0,
      })
    } else if (e.fn === 'fitness.remove_muscle_group' && e.state === 'pending') {
      const old = byId.get(String(a.p_id))
      if (old?.person_id) byId.delete(old.id)
    }
  }
  return [...byId.values()]
}

export function applyPendingMuscleSettings(
  rows: readonly MuscleSettingsRow[],
  entries: readonly QueueEntry[],
): MuscleSettingsRow[] {
  const byId = new Map(rows.map((r) => [r.muscle_id, r]))
  for (const e of entries) {
    if (e.fn !== 'fitness.set_muscle_settings') continue
    const a = args(e)
    const id = String(a.p_muscle)
    byId.set(id, {
      muscle_id: id,
      recovery_type: String(a.p_recovery),
      frequency_target: Number(a.p_frequency),
      stimulus_target: Number(a.p_stimulus),
    })
  }
  return [...byId.values()]
}

export function applyPendingGymSettings(
  settings: GymSettings,
  entries: readonly QueueEntry[],
): GymSettings {
  let out = settings
  for (const e of entries) {
    if (e.fn !== 'fitness.update_settings') continue
    const p = (args(e).p_patch ?? {}) as GymSettingsPatch
    out = {
      preferredRir: num(p.preferred_rir, out.preferredRir),
      workoutsToStall: num(p.workouts_to_stall, out.workoutsToStall),
      pointsPerFatigueSet: num(p.points_per_fatigue_set, out.pointsPerFatigueSet),
      tFastH: num(p.t_fast_h, out.tFastH),
      tNormalH: num(p.t_normal_h, out.tNormalH),
      tSlowH: num(p.t_slow_h, out.tSlowH),
    }
  }
  return out
}

export function applyPendingExercises(
  rows: readonly ExerciseRow[],
  entries: readonly QueueEntry[],
): ExerciseRow[] {
  const byId = new Map(rows.map((r) => [r.item_id, r]))
  for (const e of entries) {
    const a = args(e)
    if (e.fn === 'fitness.create_exercise') {
      const id = String(a.p_id)
      if (byId.has(id)) continue
      byId.set(id, {
        item_id: id,
        equipment_id: String(a.p_equipment),
        current_weight: Number(a.p_weight),
        current_reps: Number(a.p_reps),
        notes: typeof a.p_notes === 'string' && a.p_notes.trim() ? a.p_notes.trim() : null,
      })
    } else if (e.fn === 'fitness.update_exercise') {
      const row = byId.get(String(a.p_id))
      if (!row) continue
      const p = (a.p_patch ?? {}) as Args
      byId.set(row.item_id, {
        ...row,
        ...(typeof p.equipment_id === 'string' && { equipment_id: p.equipment_id }),
        ...(p.current_weight !== undefined && { current_weight: Number(p.current_weight) }),
        ...(p.current_reps !== undefined && { current_reps: Number(p.current_reps) }),
        ...('notes' in p && {
          notes: typeof p.notes === 'string' && p.notes.trim() ? p.notes.trim() : null,
        }),
      })
    }
  }
  return [...byId.values()]
}

export function applyPendingExerciseMuscles(
  rows: readonly ExerciseMuscle[],
  entries: readonly QueueEntry[],
): ExerciseMuscle[] {
  let out = [...rows]
  for (const e of entries) {
    const a = args(e)
    const exercise = String(a.p_exercise ?? a.p_id)
    if (e.fn === 'fitness.create_exercise') {
      if (!out.some((m) => m.exercise_id === exercise))
        out.push({ exercise_id: exercise, muscle_id: String(a.p_primary), contribution: 1 })
    } else if (e.fn === 'fitness.set_primary_muscle') {
      const muscle = String(a.p_muscle)
      // A group that is a secondary of it is refused by the server (GYM-004 2).
      if (
        out.some((m) => m.exercise_id === exercise && m.muscle_id === muscle && m.contribution < 1)
      )
        continue
      out = out.map((m) =>
        m.exercise_id === exercise && m.contribution === 1 ? { ...m, muscle_id: muscle } : m,
      )
    } else if (e.fn === 'fitness.set_secondary_muscle') {
      const muscle = String(a.p_muscle)
      const contribution = Number(a.p_contribution)
      const i = out.findIndex((m) => m.exercise_id === exercise && m.muscle_id === muscle)
      if (i < 0) out.push({ exercise_id: exercise, muscle_id: muscle, contribution })
      else if (out[i]!.contribution < 1) out[i] = { ...out[i]!, contribution }
    } else if (e.fn === 'fitness.remove_secondary_muscle' && e.state === 'pending') {
      out = out.filter(
        (m) => !(m.exercise_id === exercise && m.muscle_id === a.p_muscle && m.contribution < 1),
      )
    }
  }
  return out
}

/** A group's settings, mine where I've set them, else its defaults. */
export interface MuscleView extends MuscleGroup {
  builtIn: boolean
  recoveryType: RecoveryType
  frequencyTarget: number
  stimulusTarget: number
}

export function muscleViews(
  groups: readonly MuscleGroup[],
  settings: readonly MuscleSettingsRow[],
): MuscleView[] {
  const mine = new Map(settings.map((s) => [s.muscle_id, s]))
  const order = new Map(CATEGORIES.map((c, i) => [c.key, i]))
  return groups
    .map((g) => {
      const s = mine.get(g.id)
      return {
        ...g,
        builtIn: g.person_id === null,
        recoveryType: (s?.recovery_type ?? g.default_recovery) as RecoveryType,
        frequencyTarget: s?.frequency_target ?? DEFAULT_FREQUENCY_TARGET,
        stimulusTarget: Number(s?.stimulus_target ?? DEFAULT_STIMULUS_TARGET),
      }
    })
    .sort(
      (a, b) =>
        (order.get(a.category as MuscleCategory) ?? 9) -
          (order.get(b.category as MuscleCategory) ?? 9) ||
        // Built-in groups in their own order, mine after them by name.
        Number(a.person_id !== null) - Number(b.person_id !== null) ||
        a.position - b.position ||
        a.name.localeCompare(b.name),
    )
}

/** One of a template's exercises with its number of sets (GYM-006). */
export type TemplateLine = Omit<Fitness['template_exercises']['Row'], 'created_at' | 'updated_at'>

export const templateLinesKey = ['fitness', 'template_exercises'] as const

export async function fetchTemplateLines(): Promise<TemplateLine[]> {
  const { data, error } = await fitness()
    .from('template_exercises')
    .select('id, template_id, exercise_id, position, sets')
    .order('position')
  if (error) throw error
  return data
}

const byPosition = (a: TemplateLine, b: TemplateLine) =>
  a.position < b.position ? -1 : a.position > b.position ? 1 : a.id < b.id ? -1 : 1

/** A template's exercises with unsent additions, changes and removals laid over. */
export function applyPendingTemplateLines(
  rows: readonly TemplateLine[],
  entries: readonly QueueEntry[],
): TemplateLine[] {
  const byId = new Map(rows.map((r) => [r.id, r]))
  for (const e of entries) {
    const a = args(e)
    if (e.fn === 'fitness.add_template_exercise') {
      const id = String(a.p_id)
      if (!byId.has(id))
        byId.set(id, {
          id,
          template_id: String(a.p_template),
          exercise_id: String(a.p_exercise),
          position: String(a.p_position),
          sets: num(a.p_sets, 1),
        })
    } else if (e.fn === 'fitness.update_template_exercise') {
      const row = byId.get(String(a.p_id))
      if (!row) continue
      const p = (a.p_patch ?? {}) as Args
      byId.set(row.id, {
        ...row,
        ...(typeof p.position === 'string' && { position: p.position }),
        ...(p.sets !== undefined && { sets: Number(p.sets) }),
        ...(typeof p.exercise_id === 'string' && { exercise_id: p.exercise_id }),
      })
    } else if (e.fn === 'fitness.remove_template_exercise' && e.state === 'pending') {
      byId.delete(String(a.p_id))
    }
  }
  return [...byId.values()].sort(byPosition)
}

/** A Workout's own fields (GYM-008, GYM-012): its stage, start and end, and how it went. */
export type WorkoutRow = Omit<Fitness['workout']['Row'], 'updated_at' | 'owner_id'>
/** One of a workout's exercises: in the backlog or the session, with what it copied. */
export type EntryRow = Omit<Fitness['workout_entries']['Row'], 'created_at' | 'updated_at'>
/** A set: weight, reps and RIR, or none for a quick set (GYM-010). */
export type SetRow = Omit<Fitness['workout_sets']['Row'], 'updated_at'>

export const workoutsKey = ['fitness', 'workout'] as const
export const entriesKey = ['fitness', 'workout_entries'] as const
export const setsKey = ['fitness', 'workout_sets'] as const

export async function fetchWorkouts(): Promise<WorkoutRow[]> {
  const { data, error } = await fitness()
    .from('workout')
    .select('item_id, stage, started_at, ended_at, how_it_went, motivation, notes, discarded')
  if (error) throw error
  return data
}

export async function fetchEntries(): Promise<EntryRow[]> {
  const { data, error } = await fitness()
    .from('workout_entries')
    .select(
      'id, workout_id, exercise_id, place, position, planned_sets, begun_at, done_at, snapshot',
    )
    .order('position')
  if (error) throw error
  return data
}

export async function fetchSets(): Promise<SetRow[]> {
  const { data, error } = await fitness()
    .from('workout_sets')
    .select('id, entry_id, position, weight, reps, rir, logged_at')
    .order('position')
  if (error) throw error
  return data
}

const at = (e: QueueEntry, v: unknown) =>
  typeof v === 'string' ? v : new Date(e.createdAt).toISOString()

export function applyPendingWorkouts(
  rows: readonly WorkoutRow[],
  entries: readonly QueueEntry[],
): WorkoutRow[] {
  const byId = new Map(rows.map((r) => [r.item_id, r]))
  const blank = (id: string): WorkoutRow => ({
    item_id: id,
    stage: 'planned',
    started_at: null,
    ended_at: null,
    how_it_went: null,
    motivation: null,
    notes: null,
    discarded: false,
  })
  for (const e of entries) {
    const a = args(e)
    const id = String(a.p_id)
    const row = byId.get(id)
    if (e.fn === 'fitness.plan_workout') {
      if (!row) byId.set(id, blank(id))
    } else if (e.fn === 'fitness.start_workout') {
      if (row?.stage === 'planned')
        byId.set(id, { ...row, stage: 'in_progress', started_at: at(e, a.p_at) })
    } else if (e.fn === 'fitness.end_workout') {
      if (row?.stage === 'in_progress')
        byId.set(id, {
          ...row,
          stage: 'complete',
          ended_at: at(e, a.p_at),
          how_it_went: (a.p_how_it_went as number | null) ?? null,
          motivation: (a.p_motivation as number | null) ?? null,
          notes: typeof a.p_notes === 'string' && a.p_notes.trim() ? a.p_notes.trim() : null,
        })
    } else if (e.fn === 'fitness.update_workout' && row) {
      const p = (a.p_patch ?? {}) as Args
      byId.set(id, {
        ...row,
        ...('how_it_went' in p && { how_it_went: (p.how_it_went as number | null) ?? null }),
        ...('motivation' in p && { motivation: (p.motivation as number | null) ?? null }),
        ...('notes' in p && {
          notes: typeof p.notes === 'string' && p.notes.trim() ? p.notes.trim() : null,
        }),
      })
    }
  }
  return [...byId.values()]
}

export function applyPendingEntries(
  rows: readonly EntryRow[],
  entries: readonly QueueEntry[],
): EntryRow[] {
  const byId = new Map(rows.map((r) => [r.id, r]))
  // Sets logged, so an entry with sets stays in the session.
  for (const e of entries) {
    const a = args(e)
    const id = String(a.p_id)
    const row = byId.get(id)
    if (e.fn === 'fitness.add_entry') {
      if (row) continue
      const begin = a.p_begin === true
      byId.set(id, {
        id,
        workout_id: String(a.p_workout),
        exercise_id: String(a.p_exercise),
        place: begin ? 'session' : 'backlog',
        position: String(a.p_position),
        planned_sets: num(a.p_planned_sets, 1),
        begun_at: begin ? new Date(e.createdAt).toISOString() : null,
        done_at: null,
        // Taken by the server; the screens read the Exercise until it comes.
        snapshot: {},
      })
    } else if (e.fn === 'fitness.begin_entry' && row) {
      const begin = a.p_begin !== false
      byId.set(id, {
        ...row,
        place: begin ? 'session' : 'backlog',
        begun_at: begin ? (row.begun_at ?? at(e, a.p_at)) : null,
        done_at: begin ? row.done_at : null,
      })
    } else if (e.fn === 'fitness.swap_entry' && row?.place === 'backlog') {
      byId.set(id, { ...row, exercise_id: String(a.p_exercise), snapshot: {} })
    } else if (e.fn === 'fitness.mark_entry_done' && row?.place === 'session') {
      byId.set(id, {
        ...row,
        done_at: a.p_done === false ? null : (row.done_at ?? new Date(e.createdAt).toISOString()),
      })
    } else if (e.fn === 'fitness.remove_entry' && e.state === 'pending') {
      byId.delete(id)
    }
  }
  return [...byId.values()]
}

export function applyPendingSets(
  rows: readonly SetRow[],
  entries: readonly QueueEntry[],
): SetRow[] {
  const byId = new Map(rows.map((r) => [r.id, r]))
  const n = (v: unknown) => (v === null || v === undefined ? null : Number(v))
  for (const e of entries) {
    const a = args(e)
    const id = String(a.p_id)
    if (e.fn === 'fitness.log_set') {
      if (byId.has(id)) continue
      byId.set(id, {
        id,
        entry_id: String(a.p_entry),
        position: String(a.p_position),
        weight: n(a.p_weight),
        reps: n(a.p_reps),
        rir: n(a.p_rir),
        logged_at: at(e, a.p_at),
      })
    } else if (e.fn === 'fitness.update_set') {
      const row = byId.get(id)
      if (row) byId.set(id, { ...row, weight: n(a.p_weight), reps: n(a.p_reps), rir: n(a.p_rir) })
    } else if (e.fn === 'fitness.remove_set' && e.state === 'pending') {
      byId.delete(id)
    }
  }
  return [...byId.values()].sort((x, y) =>
    x.position < y.position ? -1 : x.position > y.position ? 1 : x.id < y.id ? -1 : 1,
  )
}
