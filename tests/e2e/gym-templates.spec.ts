import { expect, test, type Page } from '@playwright/test'
import { itemRow, standIn, type Rows } from './stand-in'

/** Ann's bench press, cable fly and pushdown, and her template Push A with two of them. */
const GYM: Rows = {
  equipment: [
    { id: 'eq-barbell', name: 'Barbell', increment: 2.5 },
    { id: 'eq-cable', name: 'Cable', increment: 0.625 },
  ],
  items: [
    itemRow({ id: 'x-bench', type: 'exercise', title: 'Bench press' }),
    itemRow({ id: 'x-fly', type: 'exercise', title: 'Cable fly' }),
    itemRow({ id: 'x-pushdown', type: 'exercise', title: 'Pushdown' }),
    itemRow({ id: 't-push', type: 'workout_template', title: 'Push A' }),
  ],
  exercise: [
    { item_id: 'x-bench', equipment_id: 'eq-barbell', current_weight: 60, current_reps: 8 },
    { item_id: 'x-fly', equipment_id: 'eq-cable', current_weight: 15, current_reps: 12 },
    { item_id: 'x-pushdown', equipment_id: 'eq-cable', current_weight: 25, current_reps: 12 },
  ],
  exercise_muscles: [
    { exercise_id: 'x-bench', muscle_id: 'mg-chest', contribution: 1 },
    { exercise_id: 'x-bench', muscle_id: 'mg-triceps', contribution: 0.4 },
    { exercise_id: 'x-fly', muscle_id: 'mg-chest', contribution: 1 },
    { exercise_id: 'x-pushdown', muscle_id: 'mg-triceps', contribution: 1 },
  ],
  template_exercises: [
    { id: 'te-1', template_id: 't-push', exercise_id: 'x-bench', position: 'h', sets: 3 },
    { id: 'te-2', template_id: 't-push', exercise_id: 'x-fly', position: 'p', sets: 2 },
  ],
}

const cards = (page: Page) => page.locator('section[data-reorder-id]')

async function pushA(page: Page) {
  await page.goto('/gym/templates/t-push')
  await expect(page.getByRole('heading', { name: 'Push A', level: 1 })).toBeVisible()
}

test.describe('templates', () => {
  test('GYM-006 1, GYM-022 1: a new template named, then exercises added by muscle group', async ({
    page,
  }) => {
    const db = await standIn(page, { signedIn: true, rows: GYM })
    await page.goto('/gym/templates')
    await expect(page.getByText('1 template')).toBeVisible()
    await page.getByRole('button', { name: 'New template' }).click()
    await page.getByRole('textbox', { name: 'Name' }).fill('push a')
    await expect(page.getByText('You already have Push A')).toBeVisible()
    await page.getByRole('textbox', { name: 'Name' }).fill('Pull A')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('heading', { name: 'Pull A', level: 1 })).toBeVisible()

    await page.getByRole('button', { name: 'Add exercise' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('button', { name: /^Chest/ })).toContainText('2')
    await dialog.getByRole('button', { name: /^Triceps/ }).click()
    await expect(dialog.getByText('Primary')).toBeVisible()
    await expect(dialog.getByRole('button', { name: /^Bench press/ })).toContainText(
      'Triceps (0.4)',
    )
    await dialog.getByRole('button', { name: /^Pushdown/ }).click()
    await expect(cards(page)).toHaveCount(1)
    await expect(cards(page).first()).toContainText('Pushdown')
    await expect(page.getByRole('group', { name: 'Pushdown sets' })).toContainText('1')
    await expect
      .poll(() => db.template_exercises.filter((t) => t.exercise_id === 'x-pushdown'))
      .toHaveLength(1)
  })

  test('GYM-006 2, 4: sets stepped, and coverage at my preferred RIR against each target', async ({
    page,
  }) => {
    const db = await standIn(page, { signedIn: true, rows: GYM })
    await pushA(page)
    const coverage = page.locator('[data-slot="card"]').filter({ hasText: 'Coverage' })
    await expect(coverage).toContainText('at RIR 1')
    // Chest: 3 + 2 sets at RIR 1; Triceps: 3 × 0.4.
    await expect(coverage).toContainText('Chest4.5 / 4')
    await expect(coverage).toContainText('Triceps1.1 / 4')
    await page.getByRole('button', { name: 'More cable fly sets' }).click()
    await expect(coverage).toContainText('Chest5.4 / 4')
    await expect.poll(() => db.template_exercises.find((t) => t.id === 'te-2')?.sets).toBe(3)
  })

  test('GYM-006 3: on a phone, an exercise dragged down by its handle never pulls to refresh', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'a finger, on a phone')
    const db = await standIn(page, { signedIn: true, rows: GYM })
    await pushA(page)
    const handle = page.getByLabel('Drag Bench press to reorder')
    const from = (await handle.boundingBox())!
    const below = (await cards(page).nth(1).boundingBox())!
    const cdp = await page.context().newCDPSession(page)
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
      })
    const x = from.x + from.width / 2
    const y0 = from.y + from.height / 2
    await touch('touchStart', x, y0)
    // Down, from the top of the page: LifeOS's pull to refresh would follow it.
    const y1 = below.y + below.height - 4
    for (let i = 1; i <= 8; i++) await touch('touchMove', x, y0 + ((y1 - y0) * i) / 8)
    await expect(page.getByRole('status', { name: 'Pull to refresh' })).toHaveCount(0)
    await touch('touchEnd', 0, 0)
    await expect(page.getByRole('status', { name: 'Refreshing' })).toHaveCount(0)
    await expect(cards(page).first()).toContainText('Cable fly')
    await expect
      .poll(() => db.template_exercises.find((t) => t.id === 'te-1')?.position ?? '')
      .not.toBe('h')
  })

  test('GYM-006 3: exercises reordered by dragging, swapped, and removed with Undo', async ({
    page,
  }) => {
    const db = await standIn(page, { signedIn: true, rows: GYM })
    await pushA(page)
    const from = await page.getByLabel('Drag Cable fly to reorder').boundingBox()
    const to = await page.getByLabel('Drag Bench press to reorder').boundingBox()
    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2)
    await page.mouse.down()
    // Over the top half of Bench press: the line shows above it.
    await page.mouse.move(to!.x + to!.width / 2, to!.y + 4, { steps: 8 })
    await expect(cards(page).first()).toHaveAttribute('data-reorder', 'before')
    await expect(cards(page).nth(1)).toHaveAttribute('data-reorder', 'dragging')
    await page.mouse.up()
    await expect(cards(page).first()).not.toHaveAttribute('data-reorder')
    await expect(cards(page).first()).toContainText('Cable fly')
    await expect
      .poll(() => {
        const [a, b] = db.template_exercises
        return a && b ? a.position > b.position : false
      })
      .toBe(true)

    await page.getByRole('button', { name: 'Bench press options' }).click()
    await page.getByRole('menuitem', { name: 'Swap…' }).click()
    await page.getByRole('searchbox', { name: 'Find an exercise' }).fill('push')
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^Pushdown/ })
      .click()
    await expect(cards(page).nth(1)).toContainText('Pushdown')
    await expect
      .poll(() => db.template_exercises.find((t) => t.id === 'te-1')?.exercise_id)
      .toBe('x-pushdown')

    await page.getByRole('button', { name: 'Pushdown options' }).click()
    await page.getByRole('menuitem', { name: 'Remove' }).click()
    await expect(cards(page)).toHaveCount(1)
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(cards(page)).toHaveCount(2)
    await expect.poll(() => db.template_exercises).toHaveLength(2)
  })

  test('GYM-006 5: duplicated, renamed, and deleted with Undo', async ({ page }) => {
    const db = await standIn(page, { signedIn: true, rows: GYM })
    await pushA(page)
    await page.getByRole('button', { name: 'Push A options' }).click()
    await page.getByRole('menuitem', { name: 'Duplicate' }).click()
    await expect(page.getByRole('heading', { name: 'Push A (copy)', level: 1 })).toBeVisible()
    await expect(cards(page)).toHaveCount(2)
    await expect
      .poll(() => db.items.find((i) => i.title === 'Push A (copy)')?.type)
      .toBe('workout_template')

    await page.getByRole('button', { name: 'Push A (copy) options' }).click()
    await page.getByRole('menuitem', { name: 'Rename' }).click()
    await page.getByRole('textbox', { name: 'Name' }).fill('Push B')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('heading', { name: 'Push B', level: 1 })).toBeVisible()

    await page.getByRole('button', { name: 'Push B options' }).click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await expect(page.getByRole('heading', { name: 'All templates', level: 1 })).toBeVisible()
    await expect(page.getByText('1 template', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText('2 templates')).toBeVisible()
  })

  test('GYM-006 5: a template a planned workout follows is not deleted', async ({ page }) => {
    const db = await standIn(page, {
      signedIn: true,
      rows: {
        ...GYM,
        items: [
          ...GYM.items!,
          itemRow({ id: 'w-1', type: 'workout', title: 'Push A', do_on: '2026-11-03' }),
        ],
        workout: [{ item_id: 'w-1' }],
        links: [{ from_item: 'w-1', to_item: 't-push', link_type: 'follows' }],
      },
    })
    await pushA(page)
    await page.getByRole('button', { name: 'Push A options' }).click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    const alert = page.getByRole('alertdialog')
    await expect(alert.getByRole('heading', { name: 'Push A is planned' })).toBeVisible()
    await expect(alert).toContainText('Tue 3 Nov')
    await alert.getByRole('button', { name: 'OK' }).click()
    await expect(page.getByRole('heading', { name: 'Push A', level: 1 })).toBeVisible()
    expect(db.items.find((i) => i.id === 't-push')?.archived_at ?? null).toBeNull()
  })

  test('GYM-006 6, GYM-022 2: on the Workouts tab, and All templates sorted', async ({ page }) => {
    await standIn(page, {
      signedIn: true,
      rows: {
        ...GYM,
        items: [...GYM.items!, itemRow({ id: 't-arms', type: 'workout_template', title: 'Arms' })],
      },
    })
    await page.goto('/gym')
    const card = page.locator('[data-slot="card"]').filter({ hasText: 'Templates' })
    await expect(card.getByRole('button', { name: /^Push A/ })).toContainText(
      '2 exercises · 5 sets · Never used',
    )
    await card.getByRole('button', { name: 'All templates' }).click()
    await expect(page.getByRole('heading', { name: 'All templates', level: 1 })).toBeVisible()
    await page.getByRole('button', { name: /^Sort/ }).click()
    await page.getByRole('menuitem', { name: 'Sets' }).click()
    await page.keyboard.press('Escape')
    const rows = page.locator('[data-slot="card"] [role="button"]')
    await expect(rows.first()).toContainText('Push A')
    await expect(rows.nth(1)).toContainText('Arms')
  })
})
