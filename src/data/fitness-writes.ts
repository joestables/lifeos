import { toKg } from '@lifeos/fitness'
import type { GymSettingsPatch } from './fitness'
import { newId } from './ids'
import type { WriteQueue } from './queue/queue'
import type { RecoveryType } from '@lifeos/fitness'

/** What a new Exercise is made with (GYM-004 1): weights in whole grams. */
export interface NewExercise {
  name: string
  equipmentId: string
  primaryId: string
  weightGrams: number
  reps: number
  notes?: string | null
}

/** What an Exercise's own fields change by (GYM-004 3). */
export interface ExercisePatch {
  name?: string
  equipmentId?: string
  weightGrams?: number
  reps?: number
  notes?: string | null
}

/**
 * The Gym's writes (ADR-0042, ADR-0058): each queues one function of the
 * `fitness` schema and returns at once; ids are made here, so a write sent
 * twice is applied once.
 */
export function fitnessWrites(queue: WriteQueue) {
  return {
    /** A piece of equipment, new or changed (GYM-001 1): its increment in grams. */
    saveEquipment(name: string, incrementGrams: number, id: string = newId()): string {
      queue.enqueue(
        'fitness.save_equipment',
        { p_id: id, p_name: name.trim(), p_increment: toKg(incrementGrams) },
        [],
      )
      return id
    },
    /** Refused by the server while an Exercise uses it (GYM-001 4). */
    removeEquipment(id: string): void {
      queue.enqueue('fitness.remove_equipment', { p_id: id }, [])
    },
    /** A muscle group of my own, new or renamed (GYM-002 2). */
    saveMuscleGroup(name: string, category: string, id: string = newId()): string {
      queue.enqueue(
        'fitness.save_muscle_group',
        { p_id: id, p_name: name.trim(), p_category: category },
        [],
      )
      return id
    },
    removeMuscleGroup(id: string): void {
      queue.enqueue('fitness.remove_muscle_group', { p_id: id }, [])
    },
    /** A group's recovery type and weekly targets (GYM-002 3, GYM-017 1). */
    setMuscleSettings(
      muscle: string,
      recovery: RecoveryType,
      frequency: number,
      stimulus: number,
    ): void {
      queue.enqueue(
        'fitness.set_muscle_settings',
        { p_muscle: muscle, p_recovery: recovery, p_frequency: frequency, p_stimulus: stimulus },
        [],
      )
    },
    updateGymSettings(patch: GymSettingsPatch): void {
      queue.enqueue('fitness.update_settings', { p_patch: patch as never }, [])
    },
    createExercise(fields: NewExercise): string {
      const id = newId()
      queue.enqueue(
        'fitness.create_exercise',
        {
          p_id: id,
          p_name: fields.name.trim(),
          p_equipment: fields.equipmentId,
          p_primary: fields.primaryId,
          p_weight: toKg(fields.weightGrams),
          p_reps: fields.reps,
          ...(fields.notes?.trim() && { p_notes: fields.notes.trim() }),
        },
        [id],
      )
      return id
    },
    updateExercise(id: string, patch: ExercisePatch): void {
      const p: Record<string, unknown> = {}
      if (patch.name !== undefined) p.name = patch.name.trim()
      if (patch.equipmentId !== undefined) p.equipment_id = patch.equipmentId
      if (patch.weightGrams !== undefined) p.current_weight = toKg(patch.weightGrams)
      if (patch.reps !== undefined) p.current_reps = patch.reps
      if (patch.notes !== undefined) p.notes = patch.notes?.trim() ?? ''
      queue.enqueue('fitness.update_exercise', { p_id: id, p_patch: p as never }, [id])
    },
    setPrimaryMuscle(exercise: string, muscle: string): void {
      queue.enqueue('fitness.set_primary_muscle', { p_exercise: exercise, p_muscle: muscle }, [
        exercise,
      ])
    },
    /** A secondary group at 0.1 to 0.9 (GYM-004 2). */
    setSecondaryMuscle(exercise: string, muscle: string, contribution: number): void {
      queue.enqueue(
        'fitness.set_secondary_muscle',
        {
          p_exercise: exercise,
          p_muscle: muscle,
          p_contribution: Math.round(contribution * 10) / 10,
        },
        [exercise],
      )
    },
    removeSecondaryMuscle(exercise: string, muscle: string): void {
      queue.enqueue('fitness.remove_secondary_muscle', { p_exercise: exercise, p_muscle: muscle }, [
        exercise,
      ])
    },
    /** Archived, or brought back (GYM-005). */
    archiveExercise(id: string, archived = true): void {
      queue.enqueue('fitness.archive_exercise', { p_id: id, p_archived: archived }, [id])
    },
  }
}

/**
 * Templates (GYM-006): each queues one function and returns at once. A
 * template's name is its Item's title; deleting it is archiving the Item
 * (Recently deleted, ADR-0032).
 */
export function templateWrites(queue: WriteQueue) {
  const addLine = (template: string, exercise: string, position: string, sets = 1): string => {
    const id = newId()
    queue.enqueue(
      'fitness.add_template_exercise',
      { p_id: id, p_template: template, p_exercise: exercise, p_position: position, p_sets: sets },
      [template],
    )
    return id
  }
  return {
    createTemplate(name: string): string {
      const id = newId()
      queue.enqueue('fitness.create_template', { p_id: id, p_name: name.trim() }, [id])
      return id
    },
    /** An exercise added with one set (GYM-006 1), or as many as a copy had. */
    addTemplateExercise: addLine,
    /** Its place (dragged), its number of sets, or its exercise (swapped). */
    updateTemplateExercise(
      template: string,
      id: string,
      patch: { position?: string; sets?: number; exerciseId?: string },
    ): void {
      queue.enqueue(
        'fitness.update_template_exercise',
        {
          p_id: id,
          p_patch: {
            ...(patch.position !== undefined && { position: patch.position }),
            ...(patch.sets !== undefined && { sets: patch.sets }),
            ...(patch.exerciseId !== undefined && { exercise_id: patch.exerciseId }),
          } as never,
        },
        [template],
      )
    },
    removeTemplateExercise(template: string, id: string): void {
      queue.enqueue('fitness.remove_template_exercise', { p_id: id }, [template])
    },
    /** A copy under a new name, its exercises and sets as they are (GYM-006 5). */
    duplicateTemplate(
      name: string,
      lines: readonly { exerciseId: string; position: string; sets: number }[],
    ): string {
      const id = newId()
      queue.enqueue('fitness.create_template', { p_id: id, p_name: name.trim() }, [id])
      for (const l of lines) addLine(id, l.exerciseId, l.position, l.sets)
      return id
    },
  }
}

/** A set's numbers: weight in whole grams, reps and RIR; all null for a quick set. */
export interface SetFields {
  weightGrams: number | null
  reps: number | null
  rir: number | null
}

/**
 * Workouts (GYM-007–GYM-012): each queues one function and returns at once,
 * ids made here, so a workout is planned, started, logged and ended with
 * no signal (GYM-021 1).
 */
export function workoutWrites(queue: WriteQueue) {
  const now = () => new Date().toISOString()
  const addEntry = (
    workout: string,
    exercise: string,
    position: string,
    begin: boolean,
    plannedSets = 1,
  ): string => {
    const id = newId()
    queue.enqueue(
      'fitness.add_entry',
      {
        p_id: id,
        p_workout: workout,
        p_exercise: exercise,
        p_position: position,
        p_begin: begin,
        p_planned_sets: plannedSets,
      },
      [workout],
    )
    return id
  }
  return {
    /** Planned for a day, from a template or empty (GYM-007 1). */
    planWorkout(day: string, template?: string): string {
      const id = newId()
      queue.enqueue(
        'fitness.plan_workout',
        { p_id: id, p_day: day, ...(template && { p_template: template }) },
        [id],
      )
      return id
    },
    /** Its name or, while planned, its day (GYM-007 3); how it went, afterwards (GYM-012 6). */
    updateWorkout(
      id: string,
      patch: {
        name?: string
        day?: string
        howItWent?: number | null
        motivation?: number | null
        notes?: string | null
      },
    ): void {
      queue.enqueue(
        'fitness.update_workout',
        {
          p_id: id,
          p_patch: {
            ...(patch.name !== undefined && { name: patch.name.trim() }),
            ...(patch.day !== undefined && { day: patch.day }),
            ...(patch.howItWent !== undefined && { how_it_went: patch.howItWent }),
            ...(patch.motivation !== undefined && { motivation: patch.motivation }),
            ...(patch.notes !== undefined && { notes: patch.notes ?? '' }),
          } as never,
        },
        [id],
      )
    },
    /**
     * A planned workout's template changed (GYM-007 3): its *follows* link
     * moved with core's link writes; a name still its old template's (or
     * "Workout") takes the new one's.
     */
    changeWorkoutTemplate(
      id: string,
      title: string,
      from: { id: string; title: string } | null,
      to: { id: string; title: string } | null,
    ): void {
      if (from?.id === to?.id) return
      if (from)
        queue.enqueue('unlink_items', { p_from: id, p_to: from.id, p_link_type: 'follows' }, [
          id,
          from.id,
        ])
      if (to)
        queue.enqueue(
          'link_items',
          { p_id: newId(), p_from: id, p_to: to.id, p_link_type: 'follows' },
          [id, to.id],
        )
      const name = to?.title ?? 'Workout'
      if (title === (from?.title ?? 'Workout') && name !== title)
        queue.enqueue('fitness.update_workout', { p_id: id, p_patch: { name } as never }, [id])
    },
    /**
     * Start (GYM-008 1): its template's exercises added to the backlog here,
     * with ids made on the device, before the server is told it started, so
     * they can be logged on with no signal; the server copies nothing then.
     */
    startWorkout(
      id: string,
      lines: readonly { exerciseId: string; position: string; sets: number }[],
    ): void {
      for (const l of lines) addEntry(id, l.exerciseId, l.position, false, l.sets)
      queue.enqueue('fitness.start_workout', { p_id: id, p_at: now() }, [id])
    },
    /** An exercise added, to the backlog or straight into the session, with one set (GYM-009 2). */
    addEntry,
    /** Add moves it into the session; back to the backlog while it has no sets (GYM-008 3, 6). */
    beginEntry(workout: string, entry: string, begin = true): void {
      queue.enqueue('fitness.begin_entry', { p_id: entry, p_begin: begin, p_at: now() }, [workout])
    },
    swapEntry(workout: string, entry: string, exercise: string): void {
      queue.enqueue('fitness.swap_entry', { p_id: entry, p_exercise: exercise }, [workout])
    },
    removeEntry(workout: string, entry: string): void {
      queue.enqueue('fitness.remove_entry', { p_id: entry }, [workout])
    },
    markEntryDone(workout: string, entry: string, done = true): void {
      queue.enqueue('fitness.mark_entry_done', { p_id: entry, p_done: done }, [workout])
    },
    /** A set logged now, or at `at` (a deleted set brought back with Undo keeps its time). */
    logSet(
      workout: string,
      entry: string,
      position: string,
      set: SetFields,
      at: string = now(),
    ): string {
      const id = newId()
      queue.enqueue(
        'fitness.log_set',
        {
          p_id: id,
          p_entry: entry,
          p_position: position,
          p_weight: set.weightGrams === null ? (null as never) : toKg(set.weightGrams),
          p_reps: set.reps as never,
          p_rir: set.rir as never,
          p_at: at,
        },
        [workout],
      )
      return id
    },
    updateSet(workout: string, id: string, set: SetFields): void {
      queue.enqueue(
        'fitness.update_set',
        {
          p_id: id,
          p_weight: set.weightGrams === null ? (null as never) : toKg(set.weightGrams),
          p_reps: set.reps as never,
          p_rir: set.rir as never,
        },
        [workout],
      )
    },
    removeSet(workout: string, id: string): void {
      queue.enqueue('fitness.remove_set', { p_id: id }, [workout])
    },
    /** End (GYM-012 1): Complete, with how it went (1–5), motivation (1–3) and notes. */
    endWorkout(
      id: string,
      fields: { howItWent: number | null; motivation: number | null; notes: string },
    ): void {
      queue.enqueue(
        'fitness.end_workout',
        {
          p_id: id,
          p_how_it_went: fields.howItWent as never,
          p_motivation: fields.motivation as never,
          p_notes: fields.notes,
          p_at: now(),
        },
        [id],
      )
    },
  }
}
