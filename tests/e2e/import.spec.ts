import { expect, test, type Page } from '@playwright/test'
import {
  BIRRIA,
  BIRRIA_V,
  CHICKEN,
  KATSU,
  KATSU_STD,
  NOODLES,
  NOODLES_STD,
  rows,
} from './recipe-rows'
import { standIn } from './stand-in'

/** A recipe as the `ai` function writes it up (ADR-0054), never from Gemini here. */
const paella = (name = 'Chicken and chorizo paella') => ({
  name,
  category: 'Dinner',
  cuisine: 'Spanish',
  protein: ['Chicken', 'Pork'],
  carbs: ['Rice'],
  servings: 4,
  prepMin: 15,
  cookMin: 40,
  notes: 'Bomba rice is best; arborio works at a push.',
  steps: ['Slice 200g chorizo 0.5cm thick.', 'Fry 4 chicken thighs for 5 minutes.'],
  lines: [
    {
      group: null,
      name: 'Chicken thighs',
      pantryId: CHICKEN,
      aisle: null,
      defaultUnit: null,
      qty: 4,
      qtyMax: null,
      approx: false,
      unit: null,
    },
    {
      group: 'For the rice',
      name: 'Chorizo',
      pantryId: null,
      aisle: 'chilled',
      defaultUnit: 'g',
      qty: 200,
      qtyMax: null,
      approx: false,
      unit: 'g',
    },
    {
      group: 'For the rice',
      name: 'Paella Rice',
      pantryId: null,
      aisle: 'cupboard',
      defaultUnit: null,
      qty: 1.5,
      qtyMax: null,
      approx: false,
      unit: 'cup',
    },
  ],
})

const LINK = 'https://www.example.com/recipes/paella'

async function start(page: Page, ai: NonNullable<Parameters<typeof standIn>[1]>['ai'] = {}) {
  const db = await standIn(page, {
    signedIn: true,
    rows: rows(),
    ai: { import: { ok: true, recipes: [paella()], photo: null, left: 29 }, ...ai },
  })
  await page.goto('/recipes')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  return db
}

/** New → Import: the PageAction on a computer, the Fab on a phone. */
async function newMenu(page: Page) {
  await page
    .getByRole('button', { name: 'New', exact: true })
    .and(page.locator('[aria-haspopup="menu"]'))
    .filter({ visible: true })
    .click()
}

async function importLink(page: Page, link = LINK) {
  await newMenu(page)
  await page.getByRole('menuitem', { name: /^Import/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Import' })
  await dialog.getByLabel('Link').fill(link)
  await dialog.getByRole('button', { name: 'Import' }).click()
}

test.describe('Import a recipe', () => {
  test('RCP-001: New offers a recipe, an idea or Import, on both tabs', async ({ page }) => {
    await start(page)
    for (const tab of ['Recipes', 'Ideas']) {
      await page.getByRole('tab', { name: tab }).click()
      await newMenu(page)
      await expect(page.getByRole('menuitem')).toHaveText(['New recipe', 'New idea', 'Import'])
      await page.keyboard.press('Escape')
    }
  })

  test('RCP-014 1, 3, 8: a link becomes a Draft to check, then kept all together', async ({
    page,
  }) => {
    const db = await start(page)
    await importLink(page)
    await expect(page.getByRole('heading', { name: 'Check the import', level: 1 })).toBeVisible()
    await expect(page.getByLabel('Name')).toHaveValue('Chicken and chorizo paella')
    // Spanish isn't on my lists: it says so.
    await expect(page.getByRole('button', { name: 'Cuisine' })).toContainText('SpanishNew')
    const ingredients = page.getByLabel('Ingredient')
    await expect(ingredients).toHaveCount(3)
    await expect(page.getByLabel('Subheading')).toHaveValue('For the rice')
    await expect(page.getByLabel('Amount').nth(2)).toHaveValue('1.5')
    await expect(page.getByRole('combobox', { name: 'Unit' }).nth(2)).toContainText('cup')
    await page.getByLabel('Amount').nth(1).fill('250')
    await page.getByRole('button', { name: 'Keep' }).click()

    await expect(page.getByRole('heading', { name: 'Chicken and chorizo paella' })).toBeVisible()
    const kept = db.items.find((i) => i.title === 'Chicken and chorizo paella')!
    expect(kept.status).toBe('active')
    expect(db.recipe.find((r) => r.item_id === kept.id)).toMatchObject({ cuisine: 'Spanish' })
    expect(db.pantry.map((p) => p.name)).toEqual(expect.arrayContaining(['Chorizo', 'Paella Rice']))
    expect(db.variation_lines.filter((l) => l.qty === 250)).toHaveLength(1)
    expect(db.values.map((v) => v.name)).toEqual(expect.arrayContaining(['Spanish', 'Pork']))
  })

  test('RCP-014 3: cancelled, it asks, and nothing is kept', async ({ page }) => {
    const db = await start(page)
    const before = db.items.length
    await importLink(page)
    await page.getByRole('button', { name: 'Cancel' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Leave' }).click()
    await expect(page).toHaveURL(/\/recipes$/)
    expect(db.items.length).toBe(before)
    expect(db.pantry.some((p) => p.name === 'Chorizo')).toBe(false)
  })

  test('RCP-014 9: a page of several recipes asks which', async ({ page }) => {
    await start(page, {
      import: {
        ok: true,
        recipes: [paella('Seafood paella'), paella('Vegetable paella')],
        photo: null,
        left: 29,
      },
    })
    await importLink(page)
    await page.getByRole('radio', { name: /Vegetable paella/ }).click()
    await page.getByRole('button', { name: 'Check it' }).click()
    await expect(page.getByLabel('Name')).toHaveValue('Vegetable paella')
  })

  test('RCP-014 6, 7: not a recipe says so; the AI unavailable, Import says why', async ({
    page,
  }) => {
    await start(page, { import: { ok: false, reason: 'not_recipe' } })
    await importLink(page)
    await expect(page.getByText('That link isn’t a recipe')).toBeVisible()
    await page.getByRole('dialog').getByText('Close', { exact: true }).click()

    await start(page, { status: { available: false, reason: 'allowance' } })
    await newMenu(page)
    const item = page.getByRole('menuitem', { name: /^Import/ })
    await expect(item).toHaveAttribute('aria-disabled', 'true')
    await expect(item).toContainText('Today’s AI allowance is used up')
  })

  test('RCP-014 5: a link saved before says where first', async ({ page }) => {
    await start(page)
    await importLink(page, 'https://youtube.com/watch?v=b1')
    await expect(page.getByText('Already saved in Birria tacos')).toBeVisible()
    await page.getByRole('button', { name: 'Import anyway' }).click()
    await expect(page.getByRole('heading', { name: 'Check the import', level: 1 })).toBeVisible()
  })

  test('RCP-014 4: an Idea imported from its link becomes a Draft, keeping its name and notes', async ({
    page,
  }) => {
    const db = await start(page)
    await page.getByRole('tab', { name: 'Ideas' }).click()
    await page
      .locator('[data-slot="item-row"]')
      .filter({ hasText: 'Birria tacos' })
      .getByRole('button', { name: 'More' })
      .click()
    await page.getByRole('menuitem', { name: 'Import from its link' }).click()
    const dialog = page.getByRole('dialog', { name: 'Import from its link' })
    await expect(dialog.getByLabel('Link')).toHaveValue('https://www.youtube.com/watch?v=b1')
    await dialog.getByRole('button', { name: 'Import' }).click()
    await expect(page.getByLabel('Name')).toHaveValue('Birria tacos')
    await page.getByRole('button', { name: 'Keep' }).click()
    await expect(page.getByRole('heading', { name: 'Birria tacos' })).toBeVisible()
    expect(db.items.find((i) => i.id === BIRRIA)?.status).toBe('active')
    expect(db.variation.find((v) => v.item_id === BIRRIA_V)?.notes).toContain(
      'Find one without the slow cooker',
    )
  })
})

test.describe('The AI in a Variation', () => {
  const line = (fields: Record<string, unknown>) => ({
    group: null,
    pantryId: null,
    aisle: 'cupboard',
    defaultUnit: null,
    qty: null,
    qtyMax: null,
    approx: false,
    unit: null,
    ...fields,
  })

  test('RCP-007 5: Fill from method replaces the lines, asked first, with Undo', async ({
    page,
  }) => {
    const db = await standIn(page, {
      signedIn: true,
      rows: rows(),
      ai: {
        fill: {
          ok: true,
          left: 28,
          lines: [
            line({ name: 'Chicken thighs', pantryId: CHICKEN, aisle: null, qty: 4 }),
            line({ name: 'Rice', qty: 300, unit: 'g' }),
          ],
        },
      },
    })
    await page.goto(`/recipes/${KATSU}?edit=variation`)
    await page.getByRole('button', { name: 'Fill from method' }).click()
    await page
      .getByRole('alertdialog', { name: 'Replace the ingredients?' })
      .getByRole('button', { name: 'Replace' })
      .click()
    await expect(page.getByLabel('Ingredient')).toHaveCount(2)
    await expect
      .poll(() =>
        db.variation_lines
          .filter((l) => l.variation_id === KATSU_STD)
          .map((l) => l.text ?? l.pantry_id),
      )
      .toEqual([CHICKEN, 'Rice'])
    // Only the method went.
    const asked = db.ai_asked.find((a) => a.task === 'recipe.fill_lines')!
    expect(asked.steps).toContain('Rinse the rice and cook it.')
    // The method is untouched.
    expect(db.variation_steps.filter((s) => s.variation_id === KATSU_STD)).toHaveLength(3)

    await page.getByRole('button', { name: 'Undo' }).click()
    await expect
      .poll(() => db.variation_lines.filter((l) => l.variation_id === KATSU_STD).length)
      .toBe(4)
  })

  test('RCP-007 5: with no method, there is nothing to fill from', async ({ page }) => {
    await standIn(page, { signedIn: true, rows: rows() })
    await page.goto(`/recipes/${NOODLES}?edit=variation`)
    await expect(page.getByRole('button', { name: 'Fill from method' })).toBeDisabled()
  })

  test('RCP-014 10: a Draft imports its ingredients and method from a link, with Undo', async ({
    page,
  }) => {
    const db = await standIn(page, {
      signedIn: true,
      rows: rows(),
      ai: { import: { ok: true, recipes: [paella()], photo: null, left: 29 } },
    })
    await page.goto(`/recipes/${NOODLES}?edit=variation`)
    await page.getByRole('button', { name: 'Import from a link' }).click()
    const dialog = page.getByRole('dialog', { name: 'Import from a link' })
    await expect(dialog.getByText('This replaces the ingredients and method')).toHaveCount(0)
    await dialog.getByLabel('Link').fill(LINK)
    await dialog.getByRole('button', { name: 'Import' }).click()
    await expect(page.getByLabel('Ingredient')).toHaveCount(3)
    await expect(page.getByRole('textbox', { name: 'Step 2' })).toHaveValue(
      'Fry 4 chicken thighs for 5 minutes.',
    )
    await expect
      .poll(() => db.variation.find((v) => v.item_id === NOODLES_STD))
      .toMatchObject({ servings: 4, sources: [LINK] })
    // The heading is the Recipe's still.
    expect(db.items.find((i) => i.id === NOODLES)?.title).toBe('Gochujang noodles')

    await page.getByRole('button', { name: 'Undo' }).click()
    await expect
      .poll(() => db.variation_steps.filter((s) => s.variation_id === NOODLES_STD).length)
      .toBe(0)
  })

  test('RCP-014 10: closed while it works, the import goes on', async ({ page }) => {
    const db = await standIn(page, {
      signedIn: true,
      rows: rows(),
      ai: { import: { ok: true, recipes: [paella()], photo: null, left: 29 }, delay: 1500 },
    })
    await page.goto(`/recipes/${NOODLES}?edit=variation`)
    await page.getByRole('button', { name: 'Import from a link' }).click()
    const dialog = page.getByRole('dialog', { name: 'Import from a link' })
    await dialog.getByLabel('Link').fill(LINK)
    await dialog.getByRole('button', { name: 'Import' }).click()
    await expect(dialog.getByLabel('Progress')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    // The cards wait for it, then take it.
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(2)
    await expect(page.getByLabel('Ingredient')).toHaveCount(3)
    await expect
      .poll(() => db.variation.find((v) => v.item_id === NOODLES_STD))
      .toMatchObject({ sources: [LINK] })
    await expect(page.getByText('Imported the ingredients and method')).toBeVisible()
  })

  test('RCP-014 10: only a Draft offers it', async ({ page }) => {
    await standIn(page, { signedIn: true, rows: rows() })
    await page.goto(`/recipes/${KATSU}?edit=variation`)
    await expect(page.getByRole('heading', { name: 'Edit variation' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Import from a link' })).toHaveCount(0)
  })
})
