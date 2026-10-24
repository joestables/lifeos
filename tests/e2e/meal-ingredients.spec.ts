import { expect, test, type Page } from '@playwright/test'
import { DISHOOM, KATSU_MEAL, LEFTOVERS, NOW, mealRows } from './meal-rows'
import { CHICKEN, PANKO } from './recipe-rows'
import { standIn, type Rows } from './stand-in'

const LINK = 'https://www.example.com/recipes/pancakes'
/** A picture, as link-preview answers it. */
const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

async function start(page: Page, rows: Rows = mealRows(), ai: Rows['ai'] = {}) {
  await page.clock.setFixedTime(NOW)
  const db = await standIn(page, { signedIn: true, rows, ai })
  await page.goto('/meal-plan')
  await expect(page.getByRole('heading', { name: 'Meal plan', level: 1 })).toBeVisible()
  return db
}

const slot = (page: Page, key: string) => page.locator(`[data-drop="${key}"]`).last()
const open = (page: Page, key: string, name: string) =>
  slot(page, key).locator('[data-slot="meal-card"]').getByRole('button', { name }).click()

test.describe('A Meal’s own ingredients', () => {
  test('MPL-006 1: a typed Meal takes lines from the Pantry', async ({ page }) => {
    const db = await start(page)
    await open(page, '2026-10-17:dinner', 'Out: Dishoom')
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Ingredients' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Add an ingredient' }).click()
    await dialog.getByLabel('Ingredient', { exact: true }).fill('Chick')
    await page.keyboard.press('Enter')
    await dialog.getByLabel('Amount').fill('2')
    await dialog.getByLabel('Amount').blur()
    await expect
      .poll(() => db.meal_lines.find((l) => l.meal_id === DISHOOM))
      .toMatchObject({ pantry_id: CHICKEN, qty: 2 })
  })

  test('MPL-006 4: a Recipe’s Meal has extra ingredients, and no link', async ({ page }) => {
    await start(page)
    await open(page, '2026-10-15:dinner', 'Katsu curry')
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Extra ingredients' })).toBeVisible()
    await expect(dialog.getByLabel('Link')).toHaveCount(0)
  })

  test('MPL-006 1: leftovers have none', async ({ page }) => {
    await start(page)
    await open(page, '2026-10-16:lunch', 'Katsu curry')
    await expect(page.getByRole('dialog').getByText('Leftovers of')).toBeVisible()
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: /ingredients/i }),
    ).toHaveCount(0)
    expect(LEFTOVERS).toBeTruthy()
  })

  test('MPL-006 2: a link’s ingredients become the Meal’s, its servings too, with Undo', async ({
    page,
  }) => {
    const db = await start(page, mealRows(), {
      meal: {
        ok: true,
        left: 28,
        servings: 4,
        lines: [
          {
            group: null,
            name: 'Panko breadcrumbs',
            pantryId: PANKO,
            aisle: null,
            defaultUnit: null,
            qty: 100,
            qtyMax: null,
            approx: false,
            unit: 'g',
          },
          {
            group: 'For the batter',
            name: 'Buttermilk',
            pantryId: null,
            aisle: 'chilled',
            defaultUnit: 'ml',
            qty: 1,
            qtyMax: null,
            approx: false,
            unit: 'cup',
          },
        ],
      },
    })
    await open(page, '2026-10-17:dinner', 'Out: Dishoom')
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Link').fill(LINK)
    await dialog.getByRole('button', { name: 'Get ingredients' }).click()
    await expect(dialog.getByLabel('Ingredient', { exact: true })).toHaveCount(2)
    await expect
      .poll(() =>
        db.meal_lines.filter((l) => l.meal_id === DISHOOM).map((l) => l.text ?? l.pantry_id),
      )
      .toEqual([PANKO, 'Buttermilk'])
    await expect
      .poll(() => db.meal.find((m) => m.item_id === DISHOOM))
      .toMatchObject({ servings: 4, source: LINK })
    await expect(dialog.getByRole('link', { name: 'Open the link' })).toHaveAttribute('href', LINK)
    // Closed, the popup doesn't put the old servings back.
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    expect(db.meal.find((m) => m.item_id === DISHOOM)).toMatchObject({ servings: 4 })

    await page.getByRole('button', { name: 'Undo' }).click()
    await expect.poll(() => db.meal_lines.filter((l) => l.meal_id === DISHOOM)).toHaveLength(0)
  })

  test('MPL-006 3: a page that isn’t a recipe says so, and the lines stay', async ({ page }) => {
    const rows = mealRows()
    const db = await start(
      page,
      {
        ...rows,
        meal_lines: [{ id: 'l1', meal_id: DISHOOM, position: 'a', text: 'Naan', qty: 2 }],
      },
      { meal: { ok: false, reason: 'not_recipe' } },
    )
    await open(page, '2026-10-17:dinner', 'Out: Dishoom')
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Link').fill(LINK)
    await dialog.getByRole('button', { name: 'Get ingredients' }).click()
    await page
      .getByRole('alertdialog', { name: 'Replace the ingredients?' })
      .getByRole('button', { name: 'Replace' })
      .click()
    await expect(dialog.getByText('That link isn’t a recipe')).toBeVisible()
    expect(db.meal_lines).toHaveLength(1)
  })

  test('MPL-006 5: Copy week copies a Meal’s lines and link', async ({ page }) => {
    const rows = mealRows()
    const db = await start(page, {
      ...rows,
      meal: (rows.meal ?? []).map((m) => (m.item_id === DISHOOM ? { ...m, source: LINK } : m)),
      meal_lines: [{ id: 'l1', meal_id: DISHOOM, position: 'a', text: 'Naan', qty: 2 }],
    })
    await page.getByRole('button', { name: 'More' }).first().click()
    await page.getByRole('menuitem', { name: 'Copy this week…' }).click()
    await page
      .getByRole('dialog', { name: 'Copy this week' })
      .getByRole('button', { name: 'Copy' })
      .click()
    await expect(page.getByText('Copied 3 meals')).toBeVisible()
    const copy = () => db.items.find((i) => i.type === 'meal' && i.do_on === '2026-10-24')
    await expect.poll(() => copy()?.id).toBeTruthy()
    await expect
      .poll(() => db.meal_lines.find((l) => l.meal_id === copy()!.id))
      .toMatchObject({ text: 'Naan', qty: 2 })
    expect(db.meal.find((m) => m.item_id === copy()!.id)).toMatchObject({ source: LINK })
    expect(KATSU_MEAL).toBeTruthy()
  })

  test('MPL-006 6: a typed Meal’s link brings its picture to the plan', async ({ page }) => {
    const db = await start(page, mealRows(), { picture: PIXEL })
    await open(page, '2026-10-17:dinner', 'Out: Dishoom')
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Link').fill(LINK)
    await dialog.getByLabel('Link').blur()
    await expect.poll(() => db.attachments.find((a) => a.item_id === DISHOOM)).toBeTruthy()
    await page.keyboard.press('Escape')
    await expect(
      slot(page, '2026-10-17:dinner').locator('[data-slot="meal-card"] img'),
    ).toHaveCount(1)
  })

  test('PAN-004 3, RCP-007 1: an entry’s default unit fills a new line', async ({ page }) => {
    const db = await start(page)
    await open(page, '2026-10-17:dinner', 'Out: Dishoom')
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Add an ingredient' }).click()
    await dialog.getByLabel('Ingredient', { exact: true }).fill('Panko')
    await page.keyboard.press('Enter')
    await expect
      .poll(() => db.meal_lines.find((l) => l.meal_id === DISHOOM))
      .toMatchObject({ pantry_id: PANKO, unit: 'g' })
  })

  test('PAN-004 1: a line kept as typed is added to the Pantry from its mark', async ({ page }) => {
    const rows = mealRows()
    const db = await start(page, {
      ...rows,
      meal_lines: [{ id: 'l1', meal_id: DISHOOM, position: 'a', text: 'Naan', qty: 2 }],
    })
    await open(page, '2026-10-17:dinner', 'Out: Dishoom')
    await page.getByRole('button', { name: 'Add Naan to the Pantry' }).click()
    const add = page.getByRole('dialog', { name: 'Add to the Pantry' })
    await add.getByLabel('Aisle').click()
    await page.getByRole('option', { name: 'Bakery' }).click()
    await add.getByRole('button', { name: 'Add' }).click()
    await expect
      .poll(() => db.pantry.find((p) => p.name === 'Naan'))
      .toMatchObject({ aisle: 'bakery' })
    const naan = db.pantry.find((p) => p.name === 'Naan')!
    await expect
      .poll(() => db.meal_lines.find((l) => l.id === 'l1'))
      .toMatchObject({ pantry_id: naan.id, text: null })
  })
})
