import { expect, test, type Page } from '@playwright/test'
import { itemRow, standIn, type Rows } from './stand-in'

const daysAgo = (d: number, h = 19) => {
  const t = new Date(Date.now() - d * 86_400_000)
  t.setUTCHours(h, 0, 0, 0)
  return t
}
const isoDay = (t: Date) => t.toISOString().slice(0, 10)

/** Chest's four presses (bench rising, the rest fewer sets) and a squat stuck at 100 kg × 5. */
const EXERCISES: [id: string, name: string, muscle: string, sets: number][] = [
  ['x-bench', 'Bench press', 'mg-chest', 3],
  ['x-incline', 'Incline press', 'mg-chest', 2],
  ['x-fly', 'Cable fly', 'mg-chest', 2],
  ['x-machine', 'Machine press', 'mg-chest', 1],
  ['x-squat', 'Squat', 'mg-quads', 3],
]

/** Eight workouts, a week apart, the last two days ago. */
const HISTORY: Rows = (() => {
  const weeks = Array.from({ length: 8 }, (_, i) => 2 + (7 - i) * 7)
  return {
    equipment: [{ id: 'eq-barbell', name: 'Barbell', increment: 2.5 }],
    items: [
      ...EXERCISES.map(([id, title]) => itemRow({ id, type: 'exercise', title })),
      ...weeks.map((d, w) =>
        itemRow({
          id: `w-${w}`,
          type: 'workout',
          title: `Week ${w + 1}`,
          do_on: isoDay(daysAgo(d)),
          status: 'done',
        }),
      ),
    ],
    exercise: EXERCISES.map(([id]) => ({
      item_id: id,
      equipment_id: 'eq-barbell',
      current_weight: id === 'x-squat' ? 100 : 60,
      current_reps: id === 'x-squat' ? 5 : 8,
    })),
    exercise_muscles: [
      ...EXERCISES.map(([id, , muscle]) => ({
        exercise_id: id,
        muscle_id: muscle,
        contribution: 1,
      })),
      { exercise_id: 'x-bench', muscle_id: 'mg-triceps', contribution: 0.4 },
      { exercise_id: 'x-squat', muscle_id: 'mg-glutes', contribution: 0.5 },
    ],
    workout: weeks.map((d, w) => ({
      item_id: `w-${w}`,
      stage: 'complete',
      started_at: daysAgo(d, 18).toISOString(),
      ended_at: daysAgo(d).toISOString(),
    })),
    workout_entries: weeks.flatMap((d, w) =>
      EXERCISES.map(([id, name], k) => ({
        id: `e-${w}-${k}`,
        workout_id: `w-${w}`,
        exercise_id: id,
        place: 'session',
        position: String.fromCharCode(104 + k),
        planned_sets: 3,
        begun_at: daysAgo(d, 18).toISOString(),
        snapshot: { name, current_weight: 60, current_reps: 8 },
      })),
    ),
    workout_sets: weeks.flatMap((d, w) =>
      EXERCISES.flatMap(([id, , , sets], k) =>
        Array.from({ length: sets }, (_, n) => ({
          id: `s-${w}-${k}-${n}`,
          entry_id: `e-${w}-${k}`,
          position: String.fromCharCode(104 + n),
          // Bench 2.5 kg heavier each week; the rest, the same every week.
          weight: id === 'x-bench' ? 50 + 2.5 * w : id === 'x-squat' ? 100 : 40,
          reps: id === 'x-squat' ? 5 : 8,
          rir: 2,
          logged_at: daysAgo(d, 18).toISOString(),
        })),
      ),
    ),
  }
})()

async function progression(page: Page, view: 'muscles' | 'exercises') {
  await page.goto(`/gym?tab=progression&view=${view}`)
}

test.describe('progression', () => {
  test('GYM-014 1–4: an Exercise’s best set each workout, its figures and best sets', async ({
    page,
  }) => {
    await standIn(page, { signedIn: true, rows: HISTORY })
    await progression(page, 'exercises')
    await page.getByRole('button', { name: /^Bench press/ }).click()
    const chart = page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByRole('heading', { name: 'Best set', exact: true }) })
    // Eight weeks of it, not three months (Joe, 3 November).
    await expect(chart).toContainText('kg · 8 weeks')
    await expect(chart).toContainText('Chest stimulus')
    // A point for each workout, its reps over it.
    const points = chart.locator('circle[data-point="best"]')
    await expect(points).toHaveCount(8)
    await expect(chart.locator('svg text', { hasText: '×8' }).first()).toBeVisible()
    // Its own tooltip: the workout, its weight, reps and RIR, the PR.
    await points.last().hover()
    const tip = page.getByRole('tooltip')
    await expect(tip).toContainText('Week 8')
    await expect(tip).toContainText('67.5 kg × 8 · 2 RIR')
    await expect(tip).toContainText('PR')
    // The bars' own: the week's stimulus sets against the target.
    await chart.locator('rect[data-week]').last().hover()
    await expect(tip).toContainText('Week of')
    await expect(tip).toContainText('Chest stimulus')
    await expect(tip).not.toContainText('67.5 kg')
    // 50 → 67.5 kg × 8 at 2 RIR, over its eight weeks: rising.
    await expect(page.getByText('+35.0 %')).toBeVisible()
    await expect(page.getByText('Rising', { exact: true })).toBeVisible()
    const best = page.locator('[data-slot="card"]').filter({ hasText: 'Best sets' })
    await expect(best.getByRole('row')).toHaveCount(9)
    await expect(best.getByRole('row').nth(1)).toContainText('67.5')
    await expect(best.getByRole('row').nth(1)).toContainText('90.0')

    await page.getByRole('button', { name: '1 month', exact: true }).click()
    await expect(chart).toContainText('kg · 1 month')
    await expect(points).toHaveCount(4)
    await expect(best.getByRole('row')).toHaveCount(9)
    await page.getByRole('button', { name: 'A year', exact: true }).click()
    await expect(chart).toContainText('kg · 8 weeks')

    // The PR opens its workout, at the top of its page.
    await page.getByRole('button', { name: /^PR 67\.5 kg × 8/ }).click()
    await expect(page.getByRole('heading', { name: 'Week 8', level: 1 })).toBeVisible()
  })

  test('a best set opened starts its workout at the top; Back returns to where it was', async ({
    page,
  }) => {
    await standIn(page, { signedIn: true, rows: HISTORY })
    await page.goto('/gym/exercises/x-bench')
    const box = page.locator('[data-scroll-restoration-id="page"]')
    const best = page.locator('[data-slot="card"]').filter({ hasText: 'Best sets' })
    await best.getByRole('row').last().scrollIntoViewIfNeeded()
    await expect.poll(() => box.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
    const was = await box.evaluate((el) => el.scrollTop)
    await best.getByRole('row').last().click()
    await expect(page.getByRole('heading', { name: 'Week 1', level: 1 })).toBeVisible()
    await expect.poll(() => box.evaluate((el) => el.scrollTop)).toBe(0)
    await page.goBack()
    await expect(best.getByRole('row').last()).toBeVisible()
    await expect.poll(() => box.evaluate((el) => el.scrollTop)).toBe(was)
  })

  test('GYM-014 5, GYM-003 1: an Exercise none of whose last five workouts beat the oldest is Stalled', async ({
    page,
  }) => {
    await standIn(page, { signedIn: true, rows: HISTORY })
    await progression(page, 'exercises')
    await expect(page.getByRole('button', { name: /^Squat/ })).toContainText('Stalled')
    await expect(page.getByRole('button', { name: /^Bench press/ })).not.toContainText('Stalled')
  })

  test('GYM-015 1: every muscle group with its category, when last trained and stalled exercises; searched, filtered, sorted', async ({
    page,
  }) => {
    await standIn(page, { signedIn: true, rows: HISTORY })
    await progression(page, 'muscles')
    const row = (name: string) => page.getByRole('button', { name: new RegExp(`^${name}`) })
    await expect(row('Quads')).toContainText('Legs')
    await expect(row('Quads')).toContainText('1 stalled')
    await expect(row('Chest')).toContainText('Push')
    await expect(row('Chest')).toContainText(/Trained /)
    await expect(row('Lats')).toContainText('Never trained')
    // In the body's order to start; Recent puts the last trained first.
    await page.getByRole('button', { name: /^Sort: Group/ }).click()
    await page.getByRole('menuitem', { name: 'Recent' }).click()
    await expect(page.getByRole('button', { name: /^Sort: Recent/ })).toBeVisible()
    await page.getByRole('button', { name: 'Filters' }).click()
    const sheet = page.getByRole('dialog')
    await sheet.getByRole('button', { name: 'Legs', exact: true }).click()
    await sheet.getByRole('button', { name: /^Show \d+ muscle groups?$/ }).click()
    await expect(row('Quads')).toBeVisible()
    await expect(row('Chest')).toHaveCount(0)
    await page.getByRole('searchbox', { name: 'Search muscles' }).fill('glu')
    await expect(row('Glutes')).toBeVisible()
    await expect(row('Quads')).toHaveCount(0)
  })

  test('GYM-015 2–5: a muscle group’s lines, three of a kind at most', async ({ page }) => {
    await standIn(page, { signedIn: true, rows: HISTORY })
    await progression(page, 'muscles')
    await page.getByRole('button', { name: /^Chest/ }).click()
    const pill = (name: string) => page.getByRole('button', { name: new RegExp(`^${name}`) })
    // The three primary exercises with the most sets, and no secondary.
    await expect(pill('Bench press')).toHaveAttribute('aria-pressed', 'true')
    await expect(pill('Incline press')).toHaveAttribute('aria-pressed', 'true')
    await expect(pill('Cable fly')).toHaveAttribute('aria-pressed', 'true')
    await expect(pill('Machine press')).toBeDisabled()
    // Its heading alone: no "3 of 3 shown" (Joe, 3 November).
    await expect(page.getByText('Primary', { exact: true })).toBeVisible()
    await expect(page.getByText(/of 3 shown/)).toHaveCount(0)
    const chart = page
      .locator('[data-slot="card"]')
      .filter({ has: page.locator('circle[data-point]') })
    await expect(chart).toContainText('Chest stimulus')
    // A point for each workout of each line shown.
    await expect(chart.locator('circle[data-point="x-bench"]')).toHaveCount(8)
    await chart.locator('circle[data-point="x-bench"]').last().hover()
    await expect(page.getByRole('tooltip')).toContainText('Bench press')
    await expect(page.getByRole('tooltip')).toContainText('+35.0 %')

    await pill('Cable fly').click()
    await expect(pill('Machine press')).toBeEnabled()
    await pill('Machine press').click()
    await expect(pill('Machine press')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Rising')).toBeVisible()
    await expect(page.getByText('1 of 4')).toBeVisible()
  })
})
