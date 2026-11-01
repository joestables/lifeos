import { describe, expect, it } from 'vitest'
import {
  applyPendingEquipment,
  applyPendingExerciseMuscles,
  applyPendingExercises,
  applyPendingGymSettings,
  applyPendingMuscleGroups,
  applyPendingMuscleSettings,
  applyPendingTemplateLines,
  DEFAULT_GYM_SETTINGS,
  muscleViews,
  type MuscleGroup,
} from './fitness'
import { applyPending } from './overlay'
import type { QueueEntry } from './queue/store'
import type { WriteFn } from './types'

let n = 0
const entry = (
  fn: WriteFn,
  args: Record<string, unknown>,
  state: QueueEntry['state'] = 'pending',
): QueueEntry => ({
  id: String(++n).padStart(4, '0'),
  fn,
  args,
  itemIds: [],
  createdAt: Date.UTC(2026, 10, 1),
  attempts: 0,
  state,
})

const group = (id: string, patch: Partial<MuscleGroup> = {}): MuscleGroup => ({
  id,
  person_id: null,
  name: id,
  category: 'push',
  body_part: id,
  default_recovery: 'normal',
  position: 1,
  ...patch,
})

describe('the Gym’s unsent changes show at once (OFF-001)', () => {
  it('equipment saved and changed, in grams to kg; a removal waits for the server (GYM-001)', () => {
    const rows = applyPendingEquipment(
      [{ id: 'b', name: 'Barbell', increment: 2.5 }],
      [
        entry('fitness.save_equipment', { p_id: 'c', p_name: ' Cable ', p_increment: 0.625 }),
        entry('fitness.save_equipment', { p_id: 'b', p_name: 'Barbell', p_increment: 1.25 }),
      ],
    )
    expect(rows).toEqual([
      { id: 'b', name: 'Barbell', increment: 1.25 },
      { id: 'c', name: 'Cable', increment: 0.625 },
    ])
    expect(
      applyPendingEquipment(rows, [entry('fitness.remove_equipment', { p_id: 'c' }, 'failed')]),
    ).toHaveLength(2)
    expect(
      applyPendingEquipment(rows, [entry('fitness.remove_equipment', { p_id: 'c' })]),
    ).toHaveLength(1)
  })

  it('a group of my own made, renamed and removed; a built-in one never removed (GYM-002)', () => {
    const made = applyPendingMuscleGroups(
      [group('chest')],
      [entry('fitness.save_muscle_group', { p_id: 'ser', p_name: 'Serratus', p_category: 'push' })],
      'me',
    )
    expect(made.find((g) => g.id === 'ser')).toMatchObject({ person_id: 'me', body_part: null })
    const gone = applyPendingMuscleGroups(
      made,
      [
        entry('fitness.remove_muscle_group', { p_id: 'ser' }),
        entry('fitness.remove_muscle_group', { p_id: 'chest' }),
      ],
      'me',
    )
    expect(gone.map((g) => g.id)).toEqual(['chest'])
  })

  it('a group’s settings, else its own recovery and the default targets (GYM-017 1)', () => {
    const settings = applyPendingMuscleSettings(
      [],
      [
        entry('fitness.set_muscle_settings', {
          p_muscle: 'lats',
          p_recovery: 'slow',
          p_frequency: 3,
          p_stimulus: 5,
        }),
      ],
    )
    const views = muscleViews(
      [
        group('quads', { category: 'legs', default_recovery: 'slow', position: 15 }),
        group('ser', { person_id: 'me', body_part: null, name: 'Serratus', position: 0 }),
        group('lats', { category: 'pull', position: 5 }),
        group('chest'),
      ],
      settings,
    )
    expect(views.map((v) => v.id)).toEqual(['chest', 'ser', 'lats', 'quads'])
    expect(views[2]).toMatchObject({ recoveryType: 'slow', frequencyTarget: 3, stimulusTarget: 5 })
    expect(views[3]).toMatchObject({ recoveryType: 'slow', frequencyTarget: 2, stimulusTarget: 4 })
    expect(views[1]?.builtIn).toBe(false)
  })

  it('Gym settings changed one at a time (GYM-020)', () => {
    expect(
      applyPendingGymSettings(DEFAULT_GYM_SETTINGS, [
        entry('fitness.update_settings', { p_patch: { preferred_rir: 2 } }),
        entry('fitness.update_settings', { p_patch: { workouts_to_stall: 6, t_slow_h: 72 } }),
      ]),
    ).toMatchObject({ preferredRir: 2, workoutsToStall: 6, tSlowH: 72, tFastH: 30 })
  })

  it('a new Exercise is an Item with its fields and primary muscle; renamed and archived (GYM-004, GYM-005)', () => {
    const create = entry('fitness.create_exercise', {
      p_id: 'x',
      p_name: ' Bench press ',
      p_equipment: 'b',
      p_primary: 'chest',
      p_weight: 62.5,
      p_reps: 8,
    })
    const items = applyPending(
      [],
      [
        create,
        entry('fitness.update_exercise', { p_id: 'x', p_patch: { name: 'Flat bench' } }),
        entry('fitness.archive_exercise', { p_id: 'x', p_archived: true }),
      ],
    )
    expect(items[0]).toMatchObject({
      id: 'x',
      type: 'exercise',
      title: 'Flat bench',
      status: 'cancelled',
      sync: 'pending',
    })
    expect(
      applyPendingExercises(
        [],
        [
          create,
          entry('fitness.update_exercise', { p_id: 'x', p_patch: { current_reps: 9, notes: ' ' } }),
        ],
      ),
    ).toEqual([
      { item_id: 'x', equipment_id: 'b', current_weight: 62.5, current_reps: 9, notes: null },
    ])
  })

  it('muscles: one primary moved, secondaries set and taken off, never the primary (GYM-004 2)', () => {
    const rows = applyPendingExerciseMuscles(
      [{ exercise_id: 'x', muscle_id: 'chest', contribution: 1 }],
      [
        entry('fitness.set_secondary_muscle', {
          p_exercise: 'x',
          p_muscle: 'tri',
          p_contribution: 0.4,
        }),
        entry('fitness.set_secondary_muscle', {
          p_exercise: 'x',
          p_muscle: 'chest',
          p_contribution: 0.3,
        }),
        entry('fitness.set_primary_muscle', { p_exercise: 'x', p_muscle: 'tri' }),
        entry('fitness.set_secondary_muscle', {
          p_exercise: 'x',
          p_muscle: 'delts',
          p_contribution: 0.3,
        }),
        entry('fitness.remove_secondary_muscle', { p_exercise: 'x', p_muscle: 'chest' }),
      ],
    )
    expect(rows).toEqual([
      { exercise_id: 'x', muscle_id: 'chest', contribution: 1 },
      { exercise_id: 'x', muscle_id: 'tri', contribution: 0.4 },
      { exercise_id: 'x', muscle_id: 'delts', contribution: 0.3 },
    ])
  })

  it('a template’s exercises added, moved, set, swapped and removed, in order (GYM-006)', () => {
    const add = (id: string, exercise: string, position: string) =>
      entry('fitness.add_template_exercise', {
        p_id: id,
        p_template: 't',
        p_exercise: exercise,
        p_position: position,
        p_sets: 1,
      })
    const rows = applyPendingTemplateLines(
      [],
      [
        add('a', 'bench', 'h'),
        add('b', 'fly', 'p'),
        add('c', 'dips', 't'),
        entry('fitness.update_template_exercise', { p_id: 'c', p_patch: { position: 'd' } }),
        entry('fitness.update_template_exercise', { p_id: 'a', p_patch: { sets: 3 } }),
        entry('fitness.update_template_exercise', { p_id: 'b', p_patch: { exercise_id: 'pec' } }),
        entry('fitness.remove_template_exercise', { p_id: 'b' }),
      ],
    )
    expect(rows.map((r) => [r.id, r.exercise_id, r.sets])).toEqual([
      ['c', 'dips', 1],
      ['a', 'bench', 3],
    ])
  })
})
