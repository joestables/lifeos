import { expect, test, type Page } from '@playwright/test'
import { KATSU, NOODLES, rows } from './recipe-rows'
import { ANN, standIn } from './stand-in'

const value = (kind: string, name: string) => ({
  id: `value-${kind}-${name}`,
  person_id: ANN.id,
  kind,
  name,
  created_at: '2026-10-01T09:00:00Z',
})

async function start(page: Page) {
  const base = rows()
  const db = await standIn(page, {
    signedIn: true,
    rows: {
      ...base,
      values: [
        value('cuisine', 'Japanese'),
        value('cuisine', 'Korean'),
        value('cuisine', 'North African'),
        value('cuisine', 'Thai'),
        value('tag', 'Quick'),
      ],
    },
  })
  await page.goto('/settings')
  await page.getByRole('link', { name: 'Recipe lists' }).click()
  await expect(page.getByRole('heading', { name: 'Recipe lists', level: 1 })).toBeVisible()
  return db
}

const cuisines = (page: Page) =>
  page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByRole('heading', { name: 'Cuisines' }) })
/** A name's CardRow: its "…" menu's parent. */
const row = (page: Page, name: string) =>
  cuisines(page)
    .getByRole('button', { name: `${name} options`, exact: true })
    .locator('xpath=..')

async function choose(page: Page, name: string, action: 'Rename' | 'Delete') {
  await page.getByRole('button', { name: `${name} options` }).click()
  await page.getByRole('menuitem', { name: action }).click()
}

test.describe('Settings → Recipe lists', () => {
  test('RCP-018 1: each list says how many of my Recipes use a name', async ({ page }) => {
    await start(page)
    await expect(row(page, 'Japanese')).toContainText('1 recipe')
    await expect(row(page, 'Thai')).toContainText('0 recipes')
  })

  test('RCP-018 1: a new name, and one already there', async ({ page }) => {
    const db = await start(page)
    await page.getByRole('button', { name: 'New cuisine' }).click()
    const name = page.getByRole('textbox', { name: 'Name' })
    await expect(name).toBeFocused()
    await name.fill('thai')
    await expect(page.getByText('Already on the list')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()
    await name.fill('Indian')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(row(page, 'Indian')).toBeVisible()
    await expect.poll(() => db.values.some((v) => v.name === 'Indian')).toBe(true)
  })

  test('RCP-018 1: a rename reaches my Recipes', async ({ page }) => {
    const db = await start(page)
    await choose(page, 'Japanese', 'Rename')
    const name = page.getByRole('textbox', { name: 'Name' })
    // An Edit opens without the keyboard.
    await expect(name).not.toBeFocused()
    await name.fill('Japanese home cooking')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(row(page, 'Japanese home cooking')).toContainText('1 recipe')
    await expect
      .poll(() => db.recipe.find((r) => r.item_id === KATSU)?.cuisine)
      .toBe('Japanese home cooking')
  })

  test('RCP-018 1: renaming onto another name merges them', async ({ page }) => {
    const db = await start(page)
    await choose(page, 'Korean', 'Rename')
    await page.getByRole('textbox', { name: 'Name' }).fill('japanese')
    await page.getByRole('button', { name: 'Save' }).click()
    const ask = page.getByRole('alertdialog')
    await expect(ask).toContainText('Merge "Korean" into "Japanese"?')
    await expect(ask).toContainText('1 recipe moves to "Japanese"')
    await ask.getByRole('button', { name: 'Merge' }).click()
    await expect(row(page, 'Korean')).toHaveCount(0)
    await expect(row(page, 'Japanese')).toContainText('2 recipes')
    await expect.poll(() => db.recipe.find((r) => r.item_id === NOODLES)?.cuisine).toBe('Japanese')
    await expect.poll(() => db.values.some((v) => v.name === 'Korean')).toBe(false)
  })

  test('RCP-018 1: a name in use isn’t deleted; one not in use is', async ({ page }) => {
    const db = await start(page)
    await choose(page, 'Japanese', 'Delete')
    const ask = page.getByRole('alertdialog')
    await expect(ask).toContainText('"Japanese" is in use')
    await expect(ask.getByRole('button', { name: 'Delete' })).toHaveCount(0)
    await ask.getByRole('button', { name: 'OK' }).click()
    await expect(row(page, 'Japanese')).toBeVisible()

    await choose(page, 'Thai', 'Delete')
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
    await expect(row(page, 'Thai')).toHaveCount(0)
    await expect.poll(() => db.values.some((v) => v.name === 'Thai')).toBe(false)
  })
})
