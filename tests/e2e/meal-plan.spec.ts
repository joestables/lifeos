import { expect, test, type Page } from '@playwright/test'
import {
  DISHOOM,
  KATSU_AIR,
  KATSU_MEAL,
  LEFTOVERS,
  NOW,
  addMeal,
  mealCards,
  mealRows,
} from './meal-rows'
import { KATSU, KATSU_STD, NOODLES, NOODLES_STD } from './recipe-rows'
import { standIn } from './stand-in'

async function start(page: Page, path = '/meal-plan', { clock = true } = {}) {
  // A fixed clock stops the page's timers too, so a press and hold needs the real one.
  if (clock) await page.clock.setFixedTime(NOW)
  const db = await standIn(page, { signedIn: true, rows: mealRows() })
  await page.goto(path)
  await expect(page.getByRole('heading', { name: /^(Meal plan|Plan)$/, level: 1 })).toBeVisible()
  return db
}

/** A day's slot on a computer; a phone's day ("2026-10-15"). */
const slot = (page: Page, key: string) => page.locator(`[data-drop="${key}"]`).last()
const cards = mealCards
const add = addMeal

const uses = (db: Awaited<ReturnType<typeof standIn>>, meal: string) =>
  db.links.find((l) => l.from_item === meal && l.link_type === 'uses')?.to_item

test.describe('The Meal plan', () => {
  test('MPL-001: the week, Monday first, with leftovers and typed Meals; other weeks', async ({
    page,
  }) => {
    await start(page)
    await expect(cards(page, '2026-10-15:dinner')).toHaveText(/Katsu curry.*Serves 4/)
    // MPL-001 4: leftovers take their Meal's name, and say so.
    await expect(cards(page, '2026-10-16:lunch')).toHaveText(/Katsu curry.*Leftovers/)
    await expect(cards(page, '2026-10-17:dinner')).toHaveText(/Out: Dishoom/)
    await expect(page.getByText('12 – 18 October')).toBeVisible()

    await page.getByRole('button', { name: 'Next week' }).click()
    await expect(page.getByText('19 – 25 October')).toBeVisible()
    await expect(page.locator('[data-slot="meal-card"]')).toHaveCount(0)
    await page.getByRole('button', { name: 'Today' }).click()
    await expect(cards(page, '2026-10-15:dinner')).toHaveCount(1)
  })

  test('MPL-002 1, 2: a Recipe planned from the slot, narrowed by its category', async ({
    page,
  }) => {
    const db = await start(page)
    await add(page, '2026-10-14:dinner')
    const picker = page.getByRole('dialog')
    // The slot's category is chosen: Shakshuka, a breakfast, isn't offered.
    await expect(
      picker.getByLabel('Category').getByRole('button', { name: 'Dinner' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(picker.getByText('Planned lately')).toBeVisible()
    await expect(picker.getByRole('button', { name: /Shakshuka/ })).toHaveCount(0)
    await picker.getByRole('button', { name: /Gochujang noodles/ }).click()
    await expect(cards(page, '2026-10-14:dinner')).toHaveText(/Gochujang noodles.*Serves 4/)
    await expect
      .poll(() => db.items.find((i) => i.type === 'meal' && i.title === 'Gochujang noodles'))
      .toMatchObject({ do_on: '2026-10-14', slot: 'dinner' })
    const meal = db.items.find((i) => i.type === 'meal' && i.title === 'Gochujang noodles')!
    await expect.poll(() => uses(db, String(meal.id))).toBe(NOODLES_STD)
    // Its servings are its Variation's, kept on the Variation (MPL-002 2).
    expect(db.meal.find((m) => m.item_id === meal.id)).toMatchObject({ servings: null })

    // A Recipe with more than one Variation asks which.
    await add(page, '2026-10-13:dinner')
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /Katsu curry/ })
      .click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /Air fryer/ })
      .click()
    await expect(cards(page, '2026-10-13:dinner')).toHaveText(/Katsu curry.*Serves 2.*Air fryer/)
  })

  test('MPL-002 3: a Meal typed, and leftovers of an earlier one', async ({ page }) => {
    const db = await start(page)
    await add(page, '2026-10-12:lunch')
    await page.getByRole('button', { name: 'Type a meal' }).click()
    await page.getByRole('textbox', { name: 'Meal' }).fill('Takeaway')
    await page.getByRole('dialog').getByRole('button', { name: 'Add' }).click()
    await expect(cards(page, '2026-10-12:lunch')).toHaveText(/Takeaway/)

    await add(page, '2026-10-16:dinner')
    await page.getByRole('button', { name: 'Leftovers' }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /Katsu curry.*Thu dinner/ })
      .click()
    await expect(cards(page, '2026-10-16:dinner')).toHaveText(/Katsu curry.*Leftovers/)
    await expect.poll(() => db.meal.filter((m) => m.leftovers_of === KATSU_MEAL)).toHaveLength(2)
  })

  test('MPL-003 1, 5: a Meal opened, eaten, rescaled and its Variation changed', async ({
    page,
  }) => {
    const db = await start(page)
    await cards(page, '2026-10-15:dinner').getByRole('button', { name: 'Katsu curry' }).click()
    const dialog = page.getByRole('dialog', { name: 'Katsu curry' })
    await expect(dialog.getByText('Meal · Thu dinner')).toBeVisible()
    await expect(dialog.getByText('Fri lunch')).toBeVisible()
    await dialog.getByRole('checkbox', { name: 'Eaten' }).click()
    await expect.poll(() => db.items.find((i) => i.id === KATSU_MEAL)?.status).toBe('done')
    await dialog.getByLabel('Servings').fill('6')
    await dialog.getByLabel('Servings').blur()
    await expect.poll(() => db.meal.find((m) => m.item_id === KATSU_MEAL)?.servings).toBe(6)
    await dialog.getByLabel('Variation').click()
    await page.getByRole('option', { name: 'Air fryer' }).click()
    await expect.poll(() => uses(db, KATSU_MEAL)).toBe(KATSU_AIR)
    // No cook is logged.
    expect(db.cooks).toHaveLength(0)
    await dialog.getByRole('button', { name: 'Katsu curry' }).click()
    await expect(page).toHaveURL(new RegExp(`/recipes/${KATSU}$`))
    expect(uses(db, KATSU_MEAL)).not.toBe(KATSU_STD)
  })

  test('MPL-003 2: a Meal moved, by dragging on a computer or Move to, with Undo', async ({
    page,
    isMobile,
  }) => {
    const db = await start(page)
    if (isMobile) {
      await cards(page, '2026-10-17:dinner').getByRole('button', { name: 'Out: Dishoom' }).click()
      await page
        .getByRole('dialog', { name: 'Out: Dishoom' })
        .getByRole('button', { name: 'More' })
        .first()
        .click()
      await page.getByRole('menuitem', { name: 'Move to…' }).click()
      const dialog = page.getByRole('dialog', { name: 'Move to' })
      await dialog.getByLabel('Slot').click()
      await page.getByRole('option', { name: 'Lunch' }).click()
      await dialog.getByRole('button', { name: 'Move' }).click()
    } else {
      const from = cards(page, '2026-10-17:dinner').first()
      const to = slot(page, '2026-10-18:lunch')
      const a = (await from.boundingBox())!
      const b = (await to.boundingBox())!
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
      await page.mouse.down()
      await page.mouse.move(a.x + a.width / 2 + 20, a.y + a.height / 2, { steps: 4 })
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 })
      await page.mouse.up()
    }
    const where = isMobile ? '2026-10-17:lunch' : '2026-10-18:lunch'
    await expect(cards(page, where)).toHaveText(/Out: Dishoom/)
    const [day, s] = where.split(':')
    await expect
      .poll(() => db.items.find((i) => i.id === DISHOOM))
      .toMatchObject({ do_on: day, slot: s })
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(cards(page, '2026-10-17:dinner')).toHaveText(/Out: Dishoom/)
  })

  test('MPL-003 2: on a phone, a Meal pressed and held is dragged to another day, keeping its slot', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'a finger, on a phone')
    const db = await start(page, '/meal-plan?day=2026-10-15', { clock: false })
    await slot(page, '2026-10-18').scrollIntoViewIfNeeded()
    const from = (await cards(page, '2026-10-17:dinner').first().boundingBox())!
    const to = (await slot(page, '2026-10-18').boundingBox())!
    const cdp = await page.context().newCDPSession(page)
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
      })
    const x = from.x + from.width / 2
    await touch('touchStart', x, from.y + from.height / 2)
    // Held still until it lifts.
    await page.waitForTimeout(600)
    for (let i = 1; i <= 6; i++)
      await touch('touchMove', x, from.y + ((to.y + to.height / 2 - from.y) * i) / 6)
    await touch('touchEnd', 0, 0)
    await expect(cards(page, '2026-10-18:dinner')).toHaveText(/Out: Dishoom/)
    await expect
      .poll(() => db.items.find((i) => i.id === DISHOOM))
      .toMatchObject({ do_on: '2026-10-18', slot: 'dinner' })
  })

  test('MPL-003 3: a Meal removed takes its leftovers, with Undo', async ({ page }) => {
    const db = await start(page)
    await cards(page, '2026-10-15:dinner').getByRole('button', { name: 'Katsu curry' }).click()
    await page
      .getByRole('dialog', { name: 'Katsu curry' })
      .getByRole('button', { name: 'More' })
      .first()
      .click()
    await page.getByRole('menuitem', { name: 'Remove' }).click()
    await expect(cards(page, '2026-10-15:dinner')).toHaveCount(0)
    await expect(cards(page, '2026-10-16:lunch')).toHaveCount(0)
    await expect
      .poll(() =>
        db.items.filter((i) => [KATSU_MEAL, LEFTOVERS].includes(String(i.id)) && i.archived_at),
      )
      .toHaveLength(2)
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(cards(page, '2026-10-16:lunch')).toHaveCount(1)
  })

  test('PLN-008: Meals on Plan in slot order, and added from its "+"', async ({
    page,
    isMobile,
  }) => {
    const db = await start(page, '/plan?day=2026-10-15')
    const card = page.locator('[data-slot="plan-card"]').filter({ hasText: 'Katsu curry' }).first()
    await expect(card).toContainText('Dinner')
    if (isMobile) await page.getByRole('button', { name: 'Add' }).last().click()
    else await page.getByRole('button', { name: 'Add' }).first().click()
    await page.getByRole('menuitem', { name: 'Meal' }).click()
    const dialog = page.getByRole('dialog', { name: /Add a meal · Thu 15 Oct/ })
    await dialog
      .getByRole('group', { name: 'Slot' })
      .getByRole('button', { name: 'Breakfast' })
      .click()
    await dialog.getByRole('button', { name: /Shakshuka/ }).click()
    await expect
      .poll(() => db.items.find((i) => i.type === 'meal' && i.title === 'Shakshuka'))
      .toMatchObject({ do_on: '2026-10-15', slot: 'breakfast' })
  })

  test('MPL-001 6: planning a Meal leaves the other photos as they are', async ({ page }) => {
    await page.clock.setFixedTime(NOW)
    const photo = `${KATSU}/p1.webp`
    const rows = mealRows()
    const other = `${NOODLES}/p2.webp`
    rows.attachments = [
      { id: 'p1', item_id: KATSU, kind: 'photo', path: photo, width: 400, height: 300 },
      { id: 'p2', item_id: NOODLES, kind: 'photo', path: other, width: 400, height: 300 },
    ]
    const db = await standIn(page, { signedIn: true, rows })
    db.files.set(photo, Buffer.from('stand-in'))
    db.files.set(other, Buffer.from('stand-in'))
    const signed: string[][] = []
    page.on('request', (r) => {
      if (r.url().includes('/storage/v1/object/sign/photos') && r.method() === 'POST')
        signed.push((r.postDataJSON() as { paths: string[] }).paths)
    })
    await page.goto('/meal-plan')
    await expect.poll(() => signed.flat()).toContain(photo)
    const asked = signed.length
    await add(page, '2026-10-14:dinner')
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /Gochujang noodles/ })
      .click()
    await expect(cards(page, '2026-10-14:dinner')).toHaveCount(1)
    // Only the new Meal's photo is asked for, not Katsu curry's again.
    await expect.poll(() => signed.slice(asked).flat()).toContain(other)
    expect(signed.slice(asked).flat()).not.toContain(photo)
  })

  test('MPL-002 1: on a phone, a day’s + opens a Dialog, its slot chosen there', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'a phone')
    const db = await start(page)
    // No slots named on a phone's day (Joe, 26 October): its "+", then the slot.
    await expect(slot(page, '2026-10-14').getByText('Lunch')).toHaveCount(0)
    await slot(page, '2026-10-14')
      .getByRole('button', { name: /^Add a meal/ })
      .tap()
    const dialog = page.getByRole('dialog', { name: /Add a meal · Wed 14 Oct/ })
    await expect(dialog.getByLabel('Slot').getByRole('button', { name: 'Dinner' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await dialog.getByLabel('Slot').getByRole('button', { name: 'Lunch' }).tap()
    await dialog.getByRole('button', { name: /Gochujang noodles/ }).tap()
    await expect(dialog).toBeHidden()
    await expect(cards(page, '2026-10-14:lunch')).toHaveText(/Gochujang noodles/)
    await expect
      .poll(() => db.items.find((i) => i.type === 'meal' && i.title === 'Gochujang noodles'))
      .toMatchObject({ do_on: '2026-10-14', slot: 'lunch' })
  })
})
