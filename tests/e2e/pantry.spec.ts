import { expect, test, type Page } from '@playwright/test'
import { GARLIC, GREEN, SPRING, pantryRows } from './pantry-rows'
import { CHICKEN, KATSU, PANKO, id } from './recipe-rows'
import { standIn } from './stand-in'

async function start(page: Page) {
  const db = await standIn(page, { signedIn: true, rows: pantryRows() })
  await page.goto('/meal-plan?tab=pantry')
  await expect(page.getByRole('heading', { name: 'Meal plan', level: 1 })).toBeVisible()
  return db
}

const aisle = (page: Page, name: string) => page.getByRole('group', { name, exact: true })
const rowOf = (page: Page, name: string) =>
  page.locator('[data-slot="pantry-row"]').filter({ hasText: name })
const names = (page: Page, card: string) =>
  aisle(page, card).locator('[data-slot="pantry-row"] span.font-semibold')

async function menu(page: Page, name: string, item: string) {
  await rowOf(page, name).getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: item }).click()
  // Closed before the next is opened.
  await expect(page.getByRole('menu')).toHaveCount(0)
}

test.describe('The Pantry', () => {
  test('PAN-001 1: ingredients by aisle, household items apart, staples marked, searched', async ({
    page,
    isMobile,
  }) => {
    await standIn(page, { signedIn: true, rows: pantryRows() })
    await page.goto('/inbox')
    if (isMobile) await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('link', { name: 'Meal plan' }).click()
    await expect(page.getByRole('heading', { name: 'Meal plan', level: 1 })).toBeVisible()
    await page.getByRole('tab', { name: 'Pantry' }).click()

    await expect(names(page, 'Fruit & Veg')).toHaveText([
      'Garlic',
      'Green onions',
      'Scallions',
      'Spring onions',
    ])
    await expect(names(page, 'Protein')).toHaveText(['Chicken thighs'])
    await expect(names(page, 'Cupboard')).toHaveText(['Panko breadcrumbs'])
    await expect(names(page, 'Household items')).toHaveText(['Bin bags'])
    // How many Recipes use each, on a computer only.
    await expect(rowOf(page, 'Panko').getByText('1 recipe')).toBeVisible({ visible: !isMobile })
    await expect(page.getByRole('button', { name: 'Garlic is a staple' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByRole('button', { name: 'Garlic out of stock' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await page.getByRole('searchbox', { name: 'Search the Pantry' }).fill('ONION')
    await expect(names(page, 'Fruit & Veg')).toHaveText(['Green onions', 'Spring onions'])
    await page.getByRole('searchbox', { name: 'Search the Pantry' }).fill('nothing like it')
    await expect(page.getByText('Nothing matches')).toBeVisible()
    await page.getByRole('searchbox', { name: 'Search the Pantry' }).fill('')

    await page.getByRole('button', { name: 'Staples', exact: true }).click()
    await expect(names(page, 'Fruit & Veg')).toHaveText(['Garlic'])
    await expect(names(page, 'Household items')).toHaveText(['Bin bags'])
    await page.getByRole('button', { name: 'Out of stock', exact: true }).click()
    await expect(names(page, 'Fruit & Veg')).toHaveText(['Garlic'])
    await expect(aisle(page, 'Household items')).toHaveCount(0)
  })

  test('PAN-001 2, PAN-002 1: a new ingredient and household item, one a staple', async ({
    page,
  }) => {
    const db = await start(page)
    await page.getByRole('button', { name: 'New entry' }).first().click()
    let dialog = page.getByRole('dialog', { name: 'New entry' })
    await dialog.getByLabel('Name').fill('garlic')
    await expect(dialog.getByText('Already in the Pantry')).toBeVisible()
    await dialog.getByLabel('Name').fill('Gochujang')
    await dialog.getByLabel('Default unit').click()
    await page.getByRole('option', { name: 'tbsp' }).click()
    await dialog.getByRole('switch').click()
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect
      .poll(() => db.pantry.find((p) => p.name === 'Gochujang'))
      .toMatchObject({ kind: 'ingredient', aisle: 'cupboard', default_unit: 'tbsp' })
    const gochujang = db.pantry.find((p) => p.name === 'Gochujang')!
    await expect
      .poll(() => db.staples.find((x) => x.pantry_id === gochujang.id))
      .toMatchObject({ space_id: 's', out_of_stock: false })
    await expect(names(page, 'Cupboard')).toHaveText(['Gochujang', 'Panko breadcrumbs'])

    await page.getByRole('button', { name: 'New entry' }).first().click()
    dialog = page.getByRole('dialog', { name: 'New entry' })
    await dialog.getByRole('button', { name: 'Household item', exact: true }).click()
    await expect(dialog.getByLabel('Aisle')).toHaveValue('Household')
    await dialog.getByLabel('Name').fill('Kitchen roll')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect
      .poll(() => db.pantry.find((p) => p.name === 'Kitchen roll'))
      .toMatchObject({ kind: 'household', aisle: null })
    await expect(names(page, 'Household items')).toHaveText(['Bin bags', 'Kitchen roll'])
  })

  test('PAN-001 3: my entry changed, renamed in every Recipe; someone else’s can’t be', async ({
    page,
  }) => {
    const db = await start(page)
    await menu(page, 'Panko breadcrumbs', 'Edit')
    const dialog = page.getByRole('dialog', { name: 'Edit entry' })
    await dialog.getByLabel('Name').fill('Panko')
    await dialog.getByLabel('Aisle').click()
    await page.getByRole('option', { name: 'Bakery' }).click()
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect
      .poll(() => db.pantry.find((p) => p.id === PANKO))
      .toMatchObject({ name: 'Panko', aisle: 'bakery' })
    await expect(names(page, 'Bakery')).toHaveText(['Panko'])

    await rowOf(page, 'Scallions').getByRole('button', { name: 'More' }).click()
    await expect(page.getByRole('menuitem')).toHaveText(['Recipes that use it'])
    await page.keyboard.press('Escape')

    await page.goto(`/recipes/${KATSU}`)
    await expect(page.getByText('Panko', { exact: true })).toBeVisible()
  })

  test('PAN-001 4, 5: which Recipes use an entry; one in use isn’t deleted', async ({ page }) => {
    const db = await start(page)
    await menu(page, 'Chicken thighs', 'Delete')
    await expect(page.getByText('Used in Katsu curry')).toBeVisible()
    expect(db.pantry.some((p) => p.id === CHICKEN)).toBe(true)

    await menu(page, 'Spring onions', 'Delete')
    await expect(rowOf(page, 'Spring onions')).toHaveCount(0)
    await expect.poll(() => db.pantry.some((p) => p.id === SPRING)).toBe(false)
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(rowOf(page, 'Spring onions')).toHaveCount(1)
    await expect.poll(() => db.pantry.some((p) => p.id === SPRING)).toBe(true)

    await menu(page, 'Chicken thighs', 'Recipes that use it')
    const dialog = page.getByRole('dialog', { name: 'Chicken thighs' })
    await dialog.getByText('Katsu curry').click()
    await expect(page).toHaveURL(new RegExp(`/recipes/${KATSU}$`))
  })

  test('PAN-002 1: a staple marked, run out, and unmarked', async ({ page }) => {
    const db = await start(page)
    await page.getByRole('button', { name: 'Spring onions is a staple' }).click()
    await expect
      .poll(() => db.staples.find((x) => x.pantry_id === SPRING))
      .toMatchObject({ out_of_stock: false })
    await page.getByRole('button', { name: 'Spring onions out of stock' }).click()
    await expect
      .poll(() => db.staples.find((x) => x.pantry_id === SPRING))
      .toMatchObject({ out_of_stock: true })
    await page.getByRole('button', { name: 'Garlic is a staple' }).click()
    await expect.poll(() => db.staples.some((x) => x.pantry_id === GARLIC)).toBe(false)
    await expect(page.getByRole('button', { name: 'Garlic out of stock' })).toBeHidden()
  })

  test('PAN-003: two of my entries merged, under the name I choose', async ({ page }) => {
    const db = await start(page)
    await menu(page, 'Spring onions', 'Merge with…')
    const dialog = page.getByRole('dialog', { name: 'Merge' })
    await expect(dialog.getByRole('button', { name: 'Merge' })).toBeDisabled()
    await dialog.getByLabel('Merge with').click()
    // Only entries I added: Sam's Scallions aren't offered.
    await expect(page.getByRole('option', { name: 'Scallions' })).toHaveCount(0)
    await page.getByRole('option', { name: 'Green onions' }).click()
    await dialog.getByLabel('Name').fill('Spring onions')
    await dialog.getByRole('button', { name: 'Merge' }).click()
    await expect.poll(() => db.pantry.some((p) => p.id === GREEN)).toBe(false)
    expect(db.variation_lines.find((l) => l.id === id(65))?.pantry_id).toBe(SPRING)
    await expect(names(page, 'Fruit & Veg')).toHaveText(['Garlic', 'Scallions', 'Spring onions'])
  })

  test('PAN-004 2: names kept as typed, added one at a time or all at once', async ({ page }) => {
    const db = await start(page)
    const typed = aisle(page, 'Kept as typed')
    await expect(typed.getByText('Honey')).toBeVisible()
    await typed.getByRole('button', { name: 'Add Honey' }).click()
    const dialog = page.getByRole('dialog', { name: 'Add to the Pantry' })
    await dialog.getByRole('button', { name: 'Add' }).click()
    await expect.poll(() => db.pantry.find((p) => p.name === 'Honey')).toBeTruthy()
    const honey = db.pantry.find((p) => p.name === 'Honey')!
    await expect
      .poll(() => db.variation_lines.find((l) => l.id === id(33)))
      .toMatchObject({ pantry_id: honey.id, text: null })
    await expect(names(page, 'Cupboard')).toHaveText(['Honey', 'Panko breadcrumbs'])
    await expect(typed.getByText('Honey')).toHaveCount(0)

    await page.getByRole('button', { name: 'Add all' }).click()
    await expect
      .poll(() => db.pantry.find((p) => p.name === 'Mirin'))
      .toMatchObject({ aisle: 'cupboard' })
    const mirin = db.pantry.find((p) => p.name === 'Mirin')!
    await expect
      .poll(() => db.variation_lines.find((l) => l.id === id(66))?.pantry_id)
      .toBe(mirin.id)
    await expect(aisle(page, 'Kept as typed')).toHaveCount(0)
  })
})
