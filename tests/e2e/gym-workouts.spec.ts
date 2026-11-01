import { expect, test, type Page } from '@playwright/test'
import { itemRow, standIn, type Rows } from './stand-in'

const TODAY = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' })

/** Ann's bench press and pushdown, and her template Push A with both. */
const GYM: Rows = {
  equipment: [
    { id: 'eq-barbell', name: 'Barbell', increment: 2.5 },
    { id: 'eq-cable', name: 'Cable', increment: 0.625 },
  ],
  items: [
    itemRow({ id: 'x-bench', type: 'exercise', title: 'Bench press' }),
    itemRow({ id: 'x-pushdown', type: 'exercise', title: 'Pushdown' }),
    itemRow({ id: 'x-fly', type: 'exercise', title: 'Cable fly' }),
    itemRow({ id: 't-push', type: 'workout_template', title: 'Push A' }),
  ],
  exercise: [
    {
      item_id: 'x-bench',
      equipment_id: 'eq-barbell',
      current_weight: 60,
      current_reps: 8,
      notes: 'Bench at 4',
    },
    { item_id: 'x-pushdown', equipment_id: 'eq-cable', current_weight: 25, current_reps: 12 },
    { item_id: 'x-fly', equipment_id: 'eq-cable', current_weight: 15, current_reps: 12 },
  ],
  exercise_muscles: [
    { exercise_id: 'x-bench', muscle_id: 'mg-chest', contribution: 1 },
    { exercise_id: 'x-bench', muscle_id: 'mg-triceps', contribution: 0.4 },
    { exercise_id: 'x-pushdown', muscle_id: 'mg-triceps', contribution: 1 },
    { exercise_id: 'x-fly', muscle_id: 'mg-chest', contribution: 1 },
  ],
  template_exercises: [
    { id: 'te-1', template_id: 't-push', exercise_id: 'x-bench', position: 'h', sets: 3 },
    { id: 'te-2', template_id: 't-push', exercise_id: 'x-pushdown', position: 'p', sets: 2 },
  ],
}

/** Push A planned for today. */
const PLANNED: Rows = {
  ...GYM,
  items: [...GYM.items!, itemRow({ id: 'w-1', type: 'workout', title: 'Push A', do_on: TODAY })],
  workout: [{ item_id: 'w-1' }],
  links: [{ from_item: 'w-1', to_item: 't-push', link_type: 'follows' }],
}

const session = (page: Page) =>
  page.locator('section').filter({ has: page.getByRole('heading', { name: 'Session' }) })
const backlog = (page: Page) =>
  page.locator('section').filter({ has: page.getByRole('heading', { name: 'Backlog' }) })

async function startPushA(page: Page) {
  await page.goto('/gym/workouts/w-1')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page.getByText('In progress')).toBeVisible()
}

test.describe('workouts', () => {
  test('GYM-007 1, 2: a workout planned from a template, and on Plan', async ({ page }) => {
    const db = await standIn(page, { signedIn: true, rows: GYM })
    await page.goto('/gym')
    await page.getByRole('button', { name: 'New workout' }).click()
    await expect(page.getByRole('radio', { name: /Push A/ })).toBeChecked()
    await page.getByRole('button', { name: 'Plan' }).click()
    await expect(page.getByRole('heading', { name: 'Push A', level: 1 })).toBeVisible()
    await expect(page.getByText('Planned')).toBeVisible()
    await expect(
      page.locator('[data-slot="card"]').filter({ hasText: 'Bench press' }),
    ).toContainText('Bench pressChest · 3 sets')
    await expect.poll(() => db.items.find((i) => i.type === 'workout')?.do_on).toBe(TODAY)
    expect(db.links.some((l) => l.link_type === 'follows' && l.to_item === 't-push')).toBe(true)

    await page.goto('/plan')
    await page
      .getByRole('button', { name: /Push A/ })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: 'Push A', level: 1 })).toBeVisible()
  })

  test('GYM-007 3: a planned workout moved to another day, its template changed, and deleted with Undo', async ({
    page,
  }) => {
    const db = await standIn(page, { signedIn: true, rows: PLANNED })
    await page.goto('/gym/workouts/w-1')
    await page.getByRole('button', { name: 'Workout', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Change day' }).click()
    await page.getByRole('combobox', { name: 'Day' }).click()
    await page.getByRole('option', { name: 'Tomorrow' }).filter({ visible: true }).click()
    await expect(page.getByRole('listbox')).toHaveCount(0)
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Tomorrow')).toBeVisible()
    await expect.poll(() => db.items.find((i) => i.id === 'w-1')?.do_on).not.toBe(TODAY)

    await page.getByRole('button', { name: 'Workout', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Change template' }).click()
    await expect(page.getByRole('radio', { name: /Push A/ })).toBeChecked()
    await page.getByRole('radio', { name: /Empty/ }).click()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('heading', { name: 'Workout', level: 1 })).toBeVisible()
    await expect.poll(() => db.links.some((l) => l.from_item === 'w-1')).toBe(false)
    await expect.poll(() => db.items.find((i) => i.id === 'w-1')?.title).toBe('Workout')

    await page.getByRole('button', { name: 'Workout', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Change template' }).click()
    await page.getByRole('radio', { name: /Push A/ }).click()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('heading', { name: 'Push A', level: 1 })).toBeVisible()
    await expect(
      page.locator('[data-slot="card"]').filter({ hasText: 'Bench press' }),
    ).toContainText('Bench pressChest · 3 sets')
    await expect
      .poll(() => db.links.some((l) => l.from_item === 'w-1' && l.to_item === 't-push'))
      .toBe(true)

    await page.getByRole('button', { name: 'Workout', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await expect(page.getByRole('heading', { name: 'Gym', level: 1 })).toBeVisible()
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect.poll(() => db.items.find((i) => i.id === 'w-1')?.archived_at).toBeNull()
  })

  test('GYM-008, GYM-010, GYM-011: started, an exercise added, sets logged and changed, done and undone, and kept', async ({
    page,
  }) => {
    const db = await standIn(page, { signedIn: true, rows: PLANNED })
    await startPushA(page)
    await expect(session(page).getByText('Add an exercise from the backlog')).toBeVisible()
    await expect(backlog(page)).toContainText('Bench pressChest · 3 sets')
    await expect.poll(() => db.workout_entries.length).toBe(2)
    await expect.poll(() => db.workout.find((w) => w.item_id === 'w-1')?.stage).toBe('in_progress')

    await page.getByRole('button', { name: 'Add Bench press' }).click()
    const card = session(page).locator('section').filter({ hasText: 'Bench press' })
    await expect(card).toContainText('0 of 3 sets')
    await expect(card).toContainText('Bench at 4')
    await expect(card).toContainText('Current 60 kg × 8')

    await card.getByRole('button', { name: 'Log set' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('textbox', { name: 'Weight' })).toHaveValue('60')
    await dialog.getByRole('button', { name: 'More weight' }).click()
    await expect(dialog.getByRole('textbox', { name: 'Weight' })).toHaveValue('62.5')
    await dialog.getByRole('button', { name: '2', exact: true }).click()
    await dialog.getByRole('button', { name: 'Log set' }).click()
    await expect(card).toContainText('1 of 3 sets')
    // The next starts at the last.
    await card.getByRole('button', { name: 'Log set' }).click()
    await expect(dialog.getByRole('textbox', { name: 'Weight' })).toHaveValue('62.5')
    await dialog.getByRole('button', { name: 'Quick' }).click()
    await dialog.getByRole('button', { name: 'Log set' }).click()
    await expect(card).toContainText('2 of 3 sets')
    await expect(card.getByLabel('Quick set')).toBeVisible()

    await card.getByRole('button', { name: 'Edit set 1' }).click()
    await dialog.getByRole('textbox', { name: 'Reps' }).fill('9')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect
      .poll(() => db.workout_sets.map((s) => [s.weight, s.reps, s.rir]))
      .toEqual([
        [62.5, 9, 2],
        [null, null, null],
      ])

    await card.getByRole('button', { name: 'Mark Bench press done' }).click()
    await expect(card.getByRole('button', { name: 'Undo Bench press done' })).toBeVisible()
    await card.getByRole('button', { name: 'Undo Bench press done' }).click()
    await expect(card.getByRole('button', { name: 'Mark Bench press done' })).toBeVisible()

    // GYM-008 8: left and come back to, it is just as it was.
    await page.reload()
    await expect(session(page).getByRole('button', { name: 'Mark Bench press done' })).toBeVisible()
    await expect(session(page).getByText('2 of 3 sets')).toBeVisible()
  })

  test('GYM-008 6, GYM-009: back to the backlog, swapped, removed with Undo, and one added', async ({
    page,
  }) => {
    const db = await standIn(page, { signedIn: true, rows: PLANNED })
    await startPushA(page)
    await page.getByRole('button', { name: 'Add Pushdown' }).click()
    await page.getByRole('button', { name: 'Pushdown options' }).click()
    await page.getByRole('menuitem', { name: 'Back to the backlog' }).click()
    await expect(backlog(page).getByRole('button', { name: 'Add Pushdown' })).toBeVisible()

    await backlog(page).getByRole('button', { name: 'Pushdown options' }).click()
    await page.getByRole('menuitem', { name: 'Swap…' }).click()
    await page.getByRole('searchbox', { name: 'Find an exercise' }).fill('fly')
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^Cable fly/ })
      .click()
    await expect(backlog(page).getByRole('button', { name: 'Add Cable fly' })).toBeVisible()

    await backlog(page).getByRole('button', { name: 'Cable fly options' }).click()
    await page.getByRole('menuitem', { name: 'Remove' }).click()
    await expect(backlog(page).getByRole('button', { name: 'Add Cable fly' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(backlog(page).getByRole('button', { name: 'Add Cable fly' })).toBeVisible()

    await page.getByRole('button', { name: 'Add exercise' }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^Triceps/ })
      .click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^Pushdown/ })
      .click()
    await expect(backlog(page).getByRole('button', { name: 'Add Pushdown' })).toBeVisible()
    await expect.poll(() => db.workout_entries.length).toBe(3)
  })

  test('GYM-005 2: an archived exercise is left out of a workout started from its template', async ({
    page,
  }) => {
    const db = await standIn(page, {
      signedIn: true,
      rows: {
        ...PLANNED,
        items: PLANNED.items!.map((i) =>
          i.id === 'x-pushdown' ? { ...i, archived_at: '2026-10-30T10:00:00Z' } : i,
        ),
      },
    })
    await startPushA(page)
    await expect(backlog(page).getByRole('button', { name: 'Add Bench press' })).toBeVisible()
    await expect(backlog(page).getByRole('button', { name: 'Add Pushdown' })).toHaveCount(0)
    await expect.poll(() => db.workout_entries.map((e) => e.exercise_id)).toEqual(['x-bench'])
  })

  test('GYM-008 7: Start says when another is in progress', async ({ page }) => {
    await standIn(page, {
      signedIn: true,
      rows: {
        ...PLANNED,
        items: [
          ...PLANNED.items!,
          itemRow({ id: 'w-0', type: 'workout', title: 'Legs', do_on: TODAY }),
        ],
        workout: [
          { item_id: 'w-1' },
          { item_id: 'w-0', stage: 'in_progress', started_at: new Date().toISOString() },
        ],
      },
    })
    await page.goto('/gym/workouts/w-1')
    await page.getByRole('button', { name: 'Start' }).click()
    await expect(page.getByText('Legs is in progress')).toBeVisible()
    await page.getByRole('button', { name: 'Open it' }).click()
    await expect(page.getByRole('heading', { name: 'Legs', level: 1 })).toBeVisible()
  })

  test('GYM-012 1–5, GYM-010 5: ended, reviewed, and the Current set updated', async ({ page }) => {
    const db = await standIn(page, { signedIn: true, rows: PLANNED })
    await startPushA(page)
    await page.getByRole('button', { name: 'Add Bench press' }).click()
    const card = session(page).locator('section').filter({ hasText: 'Bench press' })
    await card.getByRole('button', { name: 'Log set' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'More weight' }).click()
    await dialog.getByRole('button', { name: '2', exact: true }).click()
    await dialog.getByRole('button', { name: 'Log set' }).click()
    await expect(card).toContainText('1 of 3 sets')
    await expect(card.getByText('PR', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Bench press options' }).click()
    await page.getByRole('menuitem', { name: 'Strength history' }).click()
    await expect(dialog).toContainText('62.5')
    await expect(dialog).toContainText('(2 RIR)')
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'End workout' }).click()
    await expect(dialog.getByText('1 in the backlog is left out')).toBeVisible()
    await dialog.getByRole('radio', { name: '4 out of 5' }).click()
    await dialog.getByRole('radio', { name: 'High' }).click()
    await dialog.getByRole('textbox', { name: 'Notes' }).fill('Felt strong')
    await dialog.getByRole('button', { name: 'End workout' }).click()

    await expect(page.getByText('Complete')).toBeVisible()
    await expect(page.getByText('Felt strong')).toBeVisible()
    await expect
      .poll(() => db.workout.find((w) => w.item_id === 'w-1'))
      .toMatchObject({
        stage: 'complete',
        how_it_went: 4,
        motivation: 3,
      })
    const review = page.locator('[data-slot="card"]').filter({ hasText: 'Update current' })
    // 62.5 × (1 + 10 ÷ 30)
    await expect(review).toContainText('83.3')
    await expect(review.getByText('Beat current')).toBeVisible()
    await review.getByRole('button', { name: 'Update current' }).click()
    await expect(dialog.getByRole('textbox', { name: 'Weight' })).toHaveValue('62.5')
    await dialog.getByRole('button', { name: 'Update' }).click()
    await expect
      .poll(() => db.exercise.find((x) => x.item_id === 'x-bench')?.current_weight)
      .toBe(62.5)
    await expect(
      page.locator('[data-slot="card"]').filter({ hasText: 'Stimulus sets' }),
    ).toContainText('Chest')
  })

  test('GYM-012 7: a workout in progress discarded, with Undo', async ({ page }) => {
    const db = await standIn(page, { signedIn: true, rows: PLANNED })
    await startPushA(page)
    await page.getByRole('button', { name: 'Workout', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Discard workout' }).click()
    await expect(page.getByText('Discarded "Push A"')).toBeVisible()
    await expect.poll(() => db.items.find((i) => i.id === 'w-1')?.archived_at).not.toBeNull()
  })
})
