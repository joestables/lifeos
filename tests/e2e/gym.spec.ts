import { expect, test, type Page } from '@playwright/test'
import { ANN, itemRow, standIn, type Rows } from './stand-in'

/** Ann's barbell and cable, and her bench press: Chest, Triceps 0.4, Front delts 0.3. */
const GYM: Rows = {
  equipment: [
    { id: 'eq-barbell', name: 'Barbell', increment: 2.5 },
    { id: 'eq-cable', name: 'Cable', increment: 0.625 },
  ],
  items: [
    itemRow({ id: 'x-bench', type: 'exercise', title: 'Bench press' }),
    itemRow({ id: 'x-pushdown', type: 'exercise', title: 'Pushdown' }),
  ],
  exercise: [
    { item_id: 'x-bench', equipment_id: 'eq-barbell', current_weight: 60, current_reps: 8 },
    { item_id: 'x-pushdown', equipment_id: 'eq-cable', current_weight: 25, current_reps: 12 },
  ],
  exercise_muscles: [
    { exercise_id: 'x-bench', muscle_id: 'mg-chest', contribution: 1 },
    { exercise_id: 'x-bench', muscle_id: 'mg-triceps', contribution: 0.4 },
    { exercise_id: 'x-bench', muscle_id: 'mg-front_delts', contribution: 0.3 },
    { exercise_id: 'x-pushdown', muscle_id: 'mg-triceps', contribution: 1 },
  ],
}

const card = (page: Page, title: string) =>
  page.locator('[data-slot="card"]').filter({ has: page.getByText(title, { exact: true }) })

async function library(page: Page) {
  await page.goto('/gym?tab=progression&view=exercises')
  await expect(page.getByRole('heading', { name: 'Gym', level: 1 })).toBeVisible()
}

/** An Exercise opened: beside the list on a computer, its own page on a phone. */
async function openExercise(page: Page, name: string) {
  await page.getByRole('button', { name: new RegExp(`^${name}`) }).click()
  await expect(page.getByRole('heading', { name })).toBeVisible()
}

test.describe('Settings → Gym', () => {
  test('GYM-020 1, 3: Preferred RIR and Workouts to stall are steppers', async ({ page }) => {
    const db = await standIn(page, { signedIn: true })
    await page.goto('/settings')
    const gym = card(page, 'Gym')
    await gym.getByRole('button', { name: 'More preferred rir' }).click()
    await expect(gym.getByRole('group', { name: 'Preferred RIR' })).toContainText('2')
    await gym.getByRole('button', { name: 'Less workouts to stall' }).click()
    await expect(gym.getByRole('group', { name: 'Workouts to stall' })).toContainText('4')
    await expect
      .poll(() => db.settings[0])
      .toMatchObject({ preferred_rir: 2, workouts_to_stall: 4 })
  })

  test('GYM-001: equipment added with an exact increment; one in use can’t be deleted', async ({
    page,
  }) => {
    const db = await standIn(page, { signedIn: true, rows: GYM })
    await page.goto('/settings')
    await page.getByRole('link', { name: /^Equipment/ }).click()
    await expect(page.getByRole('heading', { name: 'Equipment', level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Cable/ })).toContainText('0.625 kg')

    await page.getByRole('button', { name: 'New equipment' }).click()
    await page.getByRole('textbox', { name: 'Name' }).fill('cable')
    await expect(page.getByText('You already have Cable')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()
    await page.getByRole('textbox', { name: 'Name' }).fill('Dumbbell')
    await page.getByRole('textbox', { name: 'Increment (kg)' }).fill('1.25')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('button', { name: /^Dumbbell/ })).toContainText('1.25 kg')
    await expect.poll(() => db.equipment.find((e) => e.name === 'Dumbbell')?.increment).toBe(1.25)

    await page.getByRole('button', { name: /^Barbell/ }).click()
    await expect(page.getByText('Used by 1 exercise')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete' })).toBeDisabled()
    await page.getByRole('button', { name: 'Cancel' }).click()

    await page.getByRole('button', { name: /^Dumbbell/ }).click()
    await page.getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByRole('button', { name: /^Dumbbell/ })).toHaveCount(0)
    await expect.poll(() => db.equipment.some((e) => e.name === 'Dumbbell')).toBe(false)
  })

  test('GYM-002, GYM-017: twenty groups by category; targets set; a group of my own', async ({
    page,
  }) => {
    const db = await standIn(page, { signedIn: true })
    await page.goto('/settings/muscle-groups')
    for (const c of ['Push', 'Pull', 'Core', 'Legs']) await expect(card(page, c)).toBeVisible()
    await expect(card(page, 'Pull').getByRole('button')).toHaveCount(6)
    await expect(page.getByRole('button', { name: /^Lats/ })).toContainText(
      'Normal · 2 a week · 4 sets',
    )

    await page.getByRole('button', { name: /^Lats/ }).click()
    await expect(page.getByRole('textbox', { name: 'Name' })).toHaveCount(0)
    await page
      .getByRole('radio', { name: 'Slow' })
      .or(page.getByRole('button', { name: 'Slow' }))
      .click()
    await page.getByRole('button', { name: 'More desired weekly frequency' }).click()
    await page.getByRole('button', { name: 'More stimulus sets a week' }).click()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('button', { name: /^Lats/ })).toContainText(
      'Slow · 3 a week · 5 sets',
    )
    await expect
      .poll(() => db.muscle_settings.find((m) => m.muscle_id === 'mg-lats'))
      .toMatchObject({ recovery_type: 'slow', frequency_target: 3, stimulus_target: 5 })

    await page.getByRole('button', { name: 'New muscle group' }).click()
    await page.getByRole('textbox', { name: 'Name' }).fill('chest')
    await expect(
      page
        .getByText('There’s already a muscle group called Chest')
        .or(page.getByText("There's already a muscle group called Chest")),
    ).toBeVisible()
    await page.getByRole('textbox', { name: 'Name' }).fill('Serratus')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(card(page, 'Push').getByRole('button', { name: /^Serratus/ })).toContainText(
      'Yours · Normal',
    )
    await expect
      .poll(() => db.muscle_groups.find((g) => g.name === 'Serratus'))
      .toMatchObject({ person_id: ANN.id, category: 'push' })
  })

  test('GYM-019 3: the recovery engine’s settings', async ({ page }) => {
    const db = await standIn(page, { signedIn: true })
    await page.goto('/settings/recovery')
    await page.getByRole('button', { name: 'More slow' }).click()
    await expect(page.getByRole('group', { name: 'Slow' })).toContainText('61')
    await page.getByRole('button', { name: 'Less points' }).click()
    await expect
      .poll(() => db.settings[0])
      .toMatchObject({ t_slow_h: 61, points_per_fatigue_set: 19 })
  })
})

test.describe('the exercise library', () => {
  test('GYM-001 3: with no equipment, New exercise sends me to add some', async ({ page }) => {
    await standIn(page, { signedIn: true })
    await library(page)
    await page.getByRole('button', { name: 'New exercise' }).click()
    await expect(page.getByText('Add your equipment first')).toBeVisible()
    await page.getByRole('button', { name: 'Equipment', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Equipment', level: 1 })).toBeVisible()
  })

  test('GYM-004: a new exercise with its muscles and Current set; a taken name refused', async ({
    page,
  }) => {
    const db = await standIn(page, { signedIn: true, rows: GYM })
    await library(page)
    await page.getByRole('button', { name: 'New exercise' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('textbox', { name: 'Name' }).fill('bench PRESS')
    await expect(dialog.getByText('You already have Bench press')).toBeVisible()
    await dialog.getByRole('textbox', { name: 'Name' }).fill('Cable fly')
    await dialog.getByRole('combobox', { name: 'Equipment' }).click()
    await page.getByRole('option', { name: 'Cable' }).click()
    await dialog.getByRole('combobox', { name: 'Primary muscle' }).click()
    await page.getByRole('option', { name: 'Chest' }).click()
    await dialog.getByRole('button', { name: 'Add a muscle' }).click()
    await dialog.getByRole('combobox', { name: 'Add a muscle' }).click()
    await page.getByRole('option', { name: 'Front delts' }).click()
    await dialog.getByRole('button', { name: 'Less front delts contribution' }).click()
    await expect(dialog.getByRole('group', { name: 'Front delts contribution' })).toContainText(
      '0.4',
    )
    // The weight steps by the cable's 0.625 kg.
    await dialog.getByRole('button', { name: 'More weight' }).click()
    await expect(dialog.getByRole('group', { name: 'Weight' })).toContainText('20.625')
    await dialog.getByRole('textbox', { name: 'Notes' }).fill('Bench at 3')
    await dialog.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('button', { name: /^Cable fly/ })).toContainText('Chest')
    await expect.poll(() => db.items.find((i) => i.title === 'Cable fly')?.type).toBe('exercise')
    const id = db.items.find((i) => i.title === 'Cable fly')!.id
    await expect
      .poll(() => db.exercise_muscles.filter((m) => m.exercise_id === id))
      .toEqual([
        { exercise_id: id, muscle_id: 'mg-chest', contribution: 1 },
        { exercise_id: id, muscle_id: 'mg-front_delts', contribution: 0.4 },
      ])
    expect(db.exercise.find((x) => x.item_id === id)).toMatchObject({
      equipment_id: 'eq-cable',
      current_weight: 20.625,
      current_reps: 8,
      notes: 'Bench at 3',
    })
  })

  test('GYM-004 3, GYM-003 4: an exercise opened and edited', async ({ page }) => {
    const db = await standIn(page, { signedIn: true, rows: GYM })
    await library(page)
    await openExercise(page, 'Bench press')
    await expect(page.getByText('Triceps (0.4)')).toBeVisible()
    await expect(page.getByText('60 kg × 8')).toBeVisible()
    await expect(page.getByText('Strength 78.0 at 1 RIR')).toBeVisible()
    await page.getByRole('button', { name: 'Exercise', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Edit' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'More weight' }).click()
    await dialog.getByRole('button', { name: 'Take Front delts off' }).click()
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('62.5 kg × 8')).toBeVisible()
    await expect(page.getByText('Front delts (0.3)')).toHaveCount(0)
    await expect
      .poll(() => db.exercise.find((x) => x.item_id === 'x-bench')?.current_weight)
      .toBe(62.5)
    await expect
      .poll(() => db.exercise_muscles.some((m) => m.muscle_id === 'mg-front_delts'))
      .toBe(false)
  })

  test('GYM-003 2, 3: found by name, and filtered by muscle', async ({ page }) => {
    await standIn(page, { signedIn: true, rows: GYM })
    await library(page)
    await page.getByRole('searchbox', { name: 'Search exercises' }).fill('push')
    await expect(page.getByRole('button', { name: /^Pushdown/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Bench press/ })).toHaveCount(0)
    await page.getByRole('searchbox', { name: 'Search exercises' }).fill('')
    await page.getByRole('button', { name: 'Filters' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Push', exact: true }).click()
    await page.getByRole('button', { name: 'Show 2 exercises' }).click()
    await expect(page.getByRole('button', { name: /^Bench press/ })).toBeVisible()
  })

  test('GYM-005: archived with Undo, and brought back from Settings', async ({ page }) => {
    const db = await standIn(page, { signedIn: true, rows: GYM })
    await library(page)
    await openExercise(page, 'Pushdown')
    await page.getByRole('button', { name: 'Exercise', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Archive' }).click()
    await expect(page.getByText('Archived "Pushdown"')).toBeVisible()
    await expect.poll(() => db.items.find((i) => i.id === 'x-pushdown')?.status).toBe('cancelled')
    await page.goto('/settings')
    await expect(page.getByRole('link', { name: /^Archived exercises/ })).toContainText('1')
    await page.getByRole('link', { name: /^Archived exercises/ }).click()
    await page.getByRole('button', { name: 'Bring back' }).click()
    await expect.poll(() => db.items.find((i) => i.id === 'x-pushdown')?.status).toBe('active')
  })
})
