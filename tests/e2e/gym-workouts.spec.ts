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

/** A day `n` before today, "2026-10-28". */
const daysAgo = (n: number) => {
  const d = new Date(`${TODAY}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

/**
 * Twenty-two finished workouts, one a day back from yesterday, each with
 * bench press (one to three sets); every other one followed Push A; and a
 * planned one from a month ago, Skipped.
 */
const HISTORY: Rows = (() => {
  const n = 22
  const ids = Array.from({ length: n }, (_, i) => i)
  return {
    ...GYM,
    items: [
      ...GYM.items!,
      ...ids.map((i) =>
        itemRow({
          id: `h-${i}`,
          type: 'workout',
          title: i % 2 ? 'Workout' : 'Push A',
          do_on: daysAgo(i + 1),
          status: 'done',
        }),
      ),
      itemRow({ id: 'h-skipped', type: 'workout', title: 'Legs', do_on: daysAgo(30) }),
    ],
    workout: [
      ...ids.map((i) => ({
        item_id: `h-${i}`,
        stage: 'complete',
        started_at: `${daysAgo(i + 1)}T18:00:00Z`,
        ended_at: `${daysAgo(i + 1)}T${i === 0 ? '19:30' : '19:00'}:00Z`,
        how_it_went: i === 0 ? 5 : 3,
        motivation: i === 0 ? 3 : 2,
      })),
      { item_id: 'h-skipped' },
    ],
    links: ids
      .filter((i) => i % 2 === 0)
      .map((i) => ({ from_item: `h-${i}`, to_item: 't-push', link_type: 'follows' })),
    workout_entries: ids.map((i) => ({
      id: `he-${i}`,
      workout_id: `h-${i}`,
      exercise_id: 'x-bench',
      place: 'session',
      position: 'h',
      planned_sets: 3,
      begun_at: `${daysAgo(i + 1)}T18:05:00Z`,
      snapshot: { name: 'Bench press', current_weight: 60, current_reps: 8 },
    })),
    workout_sets: ids.flatMap((i) =>
      Array.from({ length: (i % 3) + 1 }, (_, k) => ({
        id: `hs-${i}-${k}`,
        entry_id: `he-${i}`,
        position: String.fromCharCode(104 + k),
        weight: 60,
        reps: 8,
        rir: 2,
        logged_at: `${daysAgo(i + 1)}T18:1${k}:00Z`,
      })),
    ),
  }
})()

/** All workouts' filters: beside the list on a computer, in a Sheet on a phone. */
async function workoutFilters(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.getByRole('button', { name: /^Filters/ }).click()
    return page.getByRole('dialog')
  }
  return page.locator('main')
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

  test('GYM-007 4, GYM-008 1: a Skipped workout can still be started, and is dated today', async ({
    page,
  }) => {
    const db = await standIn(page, {
      signedIn: true,
      rows: {
        ...PLANNED,
        items: PLANNED.items!.map((i) => (i.id === 'w-1' ? { ...i, do_on: daysAgo(2) } : i)),
      },
    })
    await page.goto('/gym/workouts/w-1')
    await expect(page.getByText('Skipped')).toBeVisible()
    await page.getByRole('button', { name: 'Start' }).click()
    await expect(page.getByText('In progress')).toBeVisible()
    await expect.poll(() => db.items.find((i) => i.id === 'w-1')?.do_on).toBe(TODAY)
    await expect.poll(() => db.workout.find((w) => w.item_id === 'w-1')?.stage).toBe('in_progress')
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

  test('GYM-013 1, 2, 5: All workouts from Recent, newest first, twenty to a page, with its figures', async ({
    page,
  }) => {
    await standIn(page, { signedIn: true, rows: HISTORY })
    await page.goto('/gym')
    await page.getByRole('button', { name: 'All workouts' }).click()
    await expect(page.getByRole('heading', { name: 'All workouts', level: 1 })).toBeVisible()
    await expect(page.getByText('23 workouts', { exact: true })).toBeVisible()
    // 43 sets ÷ 22; 1350 minutes ÷ 22; 22 over the 23 days since the first.
    await expect(page.getByText('Average sets')).toBeVisible()
    await expect(page.locator('main')).toContainText('2.0')
    await expect(page.locator('main')).toContainText('1 h 01')
    await expect(page.locator('main')).toContainText('×6.7')
    const rows = page.locator('main [data-slot="card"]').last().getByRole('button')
    await expect(rows).toHaveCount(20)
    await expect(rows.first()).toContainText('Push A')
    await expect(rows.first()).toContainText('Complete')
    await page.getByRole('navigation', { name: 'Pages' }).getByRole('button', { name: '2' }).click()
    await expect(rows).toHaveCount(3)
    await expect(rows.last()).toContainText('Skipped')
  })

  test('GYM-013 3, 4: filtered and sorted, and both kept', async ({ page, isMobile }) => {
    await standIn(page, { signedIn: true, rows: HISTORY })
    await page.goto('/gym/workouts')
    await expect(page.getByText('23 workouts', { exact: true })).toBeVisible()
    let filters = await workoutFilters(page, isMobile)
    await filters
      .getByRole('group', { name: 'State' })
      .getByRole('button', { name: 'Skipped' })
      .click()
    if (isMobile) await page.getByRole('button', { name: 'Show 1 workout' }).click()
    await expect(page.getByText('1 workout', { exact: true })).toBeVisible()
    await expect(page.locator('main')).toContainText('Legs')

    filters = await workoutFilters(page, isMobile)
    await filters
      .getByRole('group', { name: 'State' })
      .getByRole('button', { name: 'Skipped' })
      .click()
    await filters
      .getByRole('group', { name: 'Template' })
      .getByRole('button', { name: 'None' })
      .click()
    if (isMobile) await page.getByRole('button', { name: 'Show 12 workouts' }).click()
    await expect(page.getByText('12 workouts', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: /^Sort/ }).click()
    await page.getByRole('menuitem', { name: 'Duration' }).click()
    await page.reload()
    await expect(page.getByText('12 workouts', { exact: true })).toBeVisible()
    const first = page.locator('main [data-slot="card"]').last().getByRole('button').first()
    await expect(first).toContainText('Workout')

    // A range: sets logged from 3, by its slider's keys.
    filters = await workoutFilters(page, isMobile)
    await filters.getByRole('button', { name: 'Reset' }).click()
    await filters.getByRole('button', { name: /^Sets logged/ }).click()
    const from = filters.getByRole('slider').first()
    await from.focus()
    for (let i = 0; i < 3; i++) await from.press('ArrowRight')
    if (isMobile) await page.getByRole('button', { name: 'Show 7 workouts' }).click()
    await expect(page.getByText('7 workouts', { exact: true })).toBeVisible()
  })

  test('GYM-013 3: a kept filter naming a deleted template hides nothing', async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        'lifeos.gym.workouts',
        JSON.stringify({ templates: ['t-deleted'], sort: 'date', direction: 'desc' }),
      ),
    )
    await standIn(page, { signedIn: true, rows: HISTORY })
    await page.goto('/gym/workouts')
    await expect(page.getByText('23 workouts', { exact: true })).toBeVisible()
  })

  test('GYM-012 6: a finished workout’s sets and ratings corrected', async ({ page }) => {
    const db = await standIn(page, { signedIn: true, rows: HISTORY })
    await page.goto('/gym/workouts/h-1')
    await expect(page.getByText('Complete')).toBeVisible()
    await page.getByRole('button', { name: 'Workout', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Edit' }).click()
    await page.getByRole('button', { name: 'Edit set 2' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('textbox', { name: 'Reps' }).fill('10')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect.poll(() => db.workout_sets.find((s) => s.id === 'hs-1-1')?.reps).toBe(10)

    await page.getByRole('button', { name: 'How it went' }).click()
    await expect(dialog.getByRole('radio', { name: '3 out of 5' })).toBeChecked()
    await dialog.getByRole('radio', { name: '5 out of 5' }).click()
    await dialog.getByRole('textbox', { name: 'Notes' }).fill('Sore shoulder')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Sore shoulder')).toBeVisible()
    await expect
      .poll(() => db.workout.find((w) => w.item_id === 'h-1'))
      .toMatchObject({ how_it_went: 5, notes: 'Sore shoulder' })
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByRole('button', { name: 'Edit set 2' })).toHaveCount(0)
  })

  test('GYM-021 2: Exercises, templates and workouts found in Search', async ({
    page,
    isMobile,
  }) => {
    await standIn(page, { signedIn: true, rows: PLANNED })
    await page.goto('/gym')
    if (isMobile) await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await page.getByRole('combobox', { name: 'Search' }).fill('push')
    const list = page.getByRole('listbox', { name: 'Search' })
    await expect(list.getByRole('option', { name: /Pushdown/ })).toBeVisible()
    await expect(list.getByRole('option', { name: /Push A/ })).toHaveCount(2)
    await list.getByRole('option', { name: /Pushdown/ }).click()
    await expect(page.getByRole('heading', { name: 'Pushdown' }).first()).toBeVisible()
  })

  test('GYM-021 1: offline, a workout is started, logged and ended, and sent later', async ({
    page,
    context,
  }) => {
    const db = await standIn(page, { signedIn: true, rows: PLANNED })
    await page.goto('/gym/workouts/w-1')
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible()
    // The stand-in answers before the network, so its writes are refused too.
    const noSignal = (route: Parameters<Parameters<Page['route']>[1]>[0]) =>
      route.abort('internetdisconnected')
    await page.route('**/rest/v1/rpc/**', noSignal)
    await context.setOffline(true)

    await page.getByRole('button', { name: 'Start' }).click()
    await expect(page.getByText('In progress')).toBeVisible()
    await page.getByRole('button', { name: 'Add Bench press' }).click()
    const card = session(page).locator('section').filter({ hasText: 'Bench press' })
    await card.getByRole('button', { name: 'Log set' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Log set' }).click()
    await expect(card).toContainText('1 of 3 sets')
    await page.getByRole('button', { name: 'End workout' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'End workout' }).click()
    await expect(page.getByText('Complete')).toBeVisible()
    await expect(page.locator('main')).toContainText('Stimulus sets')
    expect(db.workout_sets).toHaveLength(0)

    await page.unroute('**/rest/v1/rpc/**', noSignal)
    await context.setOffline(false)
    await expect.poll(() => db.workout.find((w) => w.item_id === 'w-1')?.stage).toBe('complete')
    expect(db.workout_sets).toHaveLength(1)
    expect(db.workout_entries.map((e) => e.exercise_id).sort()).toEqual(['x-bench', 'x-pushdown'])
  })
})
