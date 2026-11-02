import { expect, test, type Page } from '@playwright/test'
import { itemRow, standIn, type Rows } from './stand-in'

const TODAY = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' })
const YESTERDAY = new Date(Date.now() - 86_400_000).toLocaleDateString('en-CA', {
  timeZone: 'Europe/London',
})
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()

/**
 * Ann's bench press and squat, her templates Push A and Legs, and one
 * workout of four hard bench sets that ended an hour ago.
 */
const TRAINED: Rows = {
  equipment: [{ id: 'eq-barbell', name: 'Barbell', increment: 2.5 }],
  items: [
    itemRow({ id: 'x-bench', type: 'exercise', title: 'Bench press' }),
    itemRow({ id: 'x-squat', type: 'exercise', title: 'Squat' }),
    itemRow({ id: 't-push', type: 'workout_template', title: 'Push A' }),
    itemRow({ id: 't-legs', type: 'workout_template', title: 'Legs' }),
    itemRow({ id: 'w-1', type: 'workout', title: 'Push A', do_on: TODAY, status: 'done' }),
  ],
  exercise: [
    { item_id: 'x-bench', equipment_id: 'eq-barbell', current_weight: 60, current_reps: 8 },
    { item_id: 'x-squat', equipment_id: 'eq-barbell', current_weight: 80, current_reps: 6 },
  ],
  exercise_muscles: [
    { exercise_id: 'x-bench', muscle_id: 'mg-chest', contribution: 1 },
    { exercise_id: 'x-bench', muscle_id: 'mg-triceps', contribution: 0.5 },
    { exercise_id: 'x-squat', muscle_id: 'mg-quads', contribution: 1 },
  ],
  template_exercises: [
    { id: 'te-1', template_id: 't-push', exercise_id: 'x-bench', position: 'h', sets: 3 },
    { id: 'te-2', template_id: 't-legs', exercise_id: 'x-squat', position: 'h', sets: 3 },
  ],
  workout: [
    {
      item_id: 'w-1',
      stage: 'complete',
      started_at: hoursAgo(2),
      ended_at: hoursAgo(1),
    },
  ],
  links: [{ from_item: 'w-1', to_item: 't-push', link_type: 'follows' }],
  workout_entries: [
    {
      id: 'e-1',
      workout_id: 'w-1',
      exercise_id: 'x-bench',
      place: 'session',
      position: 'h',
      planned_sets: 4,
      begun_at: hoursAgo(2),
      snapshot: { name: 'Bench press', current_weight: 60, current_reps: 8 },
    },
  ],
  workout_sets: ['h', 'i', 'j', 'k'].map((position, i) => ({
    id: `s-${i}`,
    entry_id: 'e-1',
    position,
    weight: 60,
    reps: 8,
    rir: 0,
    logged_at: hoursAgo(1.5),
  })),
}

/** The muscle list's rows: each named by its ring, then its group. */
const rows = (page: Page) => page.getByRole('button', { name: /^\d+ % ready / })

/** A percentage shown as text: "41 %". */
const percentOf = async (text: Promise<string | null>) =>
  Number(/(\d+) %/.exec((await text) ?? '')?.[1])

test.describe('recovery', () => {
  test('GYM-016 1–3: overall readiness, the body map and every group, now and ahead', async ({
    page,
  }) => {
    await standIn(page, { signedIn: true, rows: TRAINED })
    await page.goto('/gym?tab=recovery')
    await expect(page.getByText('Overall readiness · Now')).toBeVisible()
    const chest = page.getByRole('button', { name: /^Chest \d+ %$/ })
    // Once the workout is in.
    await expect(page.getByRole('button', { name: 'Chest 100 %' })).toHaveCount(0)
    const now = await percentOf(chest.getAttribute('aria-label'))
    expect(now).toBeLessThan(100)
    // Quads weren't trained: green, at 100 %.
    await expect(page.getByRole('button', { name: 'Quads 100 %' })).toBeVisible()
    const row = page.getByRole('button', { name: /^\d+ % ready Chest/ })
    await expect(row).toContainText('Trained today')
    await expect(row).toContainText('×0.3 a week')
    await expect(rows(page)).toHaveCount(20)

    const slider = page.getByRole('slider', { name: 'Look ahead' })
    await slider.focus()
    await slider.press('End')
    await expect(page.getByText(/Overall readiness · \+48 h · \w{3} \d\d:\d\d/)).toBeVisible()
    await expect.poll(() => percentOf(chest.getAttribute('aria-label'))).toBeGreaterThan(now)
  })

  test('GYM-016 4, 5: sorted and kept; a group opens its readiness and its week', async ({
    page,
  }) => {
    await standIn(page, { signedIn: true, rows: TRAINED })
    await page.goto('/gym?tab=recovery')
    // Least ready first, to start.
    await expect(rows(page).first()).toContainText('Chest')
    await page.getByRole('button', { name: /^Sort/ }).click()
    await page.getByRole('menuitem', { name: 'Readiness, ascending: reverse' }).click()
    await page.reload()
    await expect(rows(page).last()).toContainText('Chest')

    // Chosen on the map: one of its shapes.
    await page
      .getByRole('button', { name: /^Chest \d+ %$/ })
      .locator('path, ellipse, rect')
      .first()
      .click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Chest' })).toBeVisible()
    await expect(dialog).toContainText('Push · recovers normally')
    await expect(dialog).toContainText(/\d+ % ready/)
    await expect(dialog).toContainText(/Fully recovered \w{3} \d+ \w{3}, \d\d:\d\d/)
    await expect(dialog).toContainText('Today')
    // One workout this week of two wanted; 4 stimulus sets of 4.
    await expect(dialog).toContainText('1 / 2')
    await expect(dialog).toContainText('4.0 / 4')
  })

  test('GYM-016 6: a workout deleted, and readiness follows at once', async ({ page }) => {
    await standIn(page, { signedIn: true, rows: TRAINED })
    await page.goto('/gym/workouts/w-1')
    await page.getByRole('button', { name: 'Workout', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await page.getByRole('tab', { name: 'Recovery' }).click()
    await expect(page.getByRole('button', { name: 'Chest 100 %' })).toBeVisible()
    await expect(page.getByText('100 %', { exact: true })).toBeVisible()
  })

  test('GYM-018: nothing planned, the most suitable template is suggested and planned for today', async ({
    page,
  }) => {
    // Yesterday's workout: nothing done or planned today.
    const db = await standIn(page, {
      signedIn: true,
      rows: {
        ...TRAINED,
        items: TRAINED.items!.map((i) => (i.id === 'w-1' ? { ...i, do_on: YESTERDAY } : i)),
      },
    })
    await page.goto('/gym')
    const today = page.locator('[data-slot="card"]').filter({ hasText: 'Most suitable' })
    // Chest was trained an hour ago, so Legs.
    const legs = today.getByRole('button', { name: /^Legs/ })
    await expect(legs).toContainText('Readiness 100 %')
    await expect(legs).toContainText('never used')
    await legs.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('radio', { name: /Legs/ })).toBeChecked()
    await dialog.getByRole('button', { name: 'Plan' }).click()
    await expect(page.getByRole('heading', { name: 'Legs', level: 1 })).toBeVisible()
    await expect
      .poll(() => db.links.some((l) => l.link_type === 'follows' && l.to_item === 't-legs'))
      .toBe(true)
  })

  test('GYM-013 1: a workout done today shows under Today, not a suggestion', async ({ page }) => {
    await standIn(page, { signedIn: true, rows: TRAINED })
    await page.goto('/gym')
    const today = page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByRole('heading', { name: 'Today' }) })
    await expect(today.getByRole('button', { name: /^Push A/ })).toContainText('Complete')
    await expect(today.getByRole('button', { name: /^Push A/ })).toContainText('4 sets')
    await expect(today.getByText('Most suitable')).toHaveCount(0)
  })
})
