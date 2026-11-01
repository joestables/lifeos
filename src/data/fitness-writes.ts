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
