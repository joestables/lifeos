import { expect, test, type Locator, type Page } from '@playwright/test'
import { itemRow, standIn, type Rows } from './stand-in'

/** Lists on Notes (ADR-0069; NTE-006–008). */

const LISBON = '00000000-0000-7000-8000-0000000000b1'
const GARDEN = '00000000-0000-7000-8000-0000000000b2'
const DONE = '00000000-0000-7000-8000-0000000000b3'
const TRAVEL = '00000000-0000-7000-8000-0000000000c1'
const line = (id: number) => `00000000-0000-7000-8000-${String(id).padStart(12, '0')}`

/** Lisbon (two lines, one ticked, and Clothes), Garden (pinned, a Label), and a done List. */
function rows(): Rows {
  return {
    items: [
      itemRow({
        id: LISBON,
        type: 'list',
        title: 'Lisbon',
        updated_at: '2026-11-02T09:00:00Z',
      }),
      itemRow({ id: GARDEN, type: 'list', title: 'Garden', updated_at: '2026-11-01T09:00:00Z' }),
      itemRow({ id: DONE, type: 'list', title: 'Boots', status: 'done' }),
      itemRow({ id: line(900), type: 'thought', title: 'Packing for Rome' }),
    ],
    list_lines: [
      { id: line(1), list_id: LISBON, position: 'a', text: 'Passport', checked: true },
      { id: line(2), list_id: LISBON, position: 'b', text: 'Sun cream' },
      { id: line(3), list_id: LISBON, position: 'c', heading: 'Clothes' },
      { id: line(4), list_id: LISBON, position: 'd', text: 'Swim shorts' },
      { id: line(5), list_id: GARDEN, position: 'a', text: 'Mow' },
      { id: line(6), list_id: DONE, position: 'a', text: 'Plasters', checked: true },
    ],
    marks: [{ item_id: GARDEN }],
    labels: [{ id: TRAVEL, name: 'Travel' }],
    item_labels: [{ item_id: LISBON, label_id: TRAVEL }],
  }
}

async function start(page: Page, path = '/notes?tab=lists') {
  const db = await standIn(page, { signedIn: true, rows: rows() })
  await page.goto(path)
  return db
}

const card = (page: Page, title: string) =>
  page.locator('[data-slot="note-card"]').filter({ hasText: title })
const row = (where: Page | Locator, name: string) =>
  where.locator('[data-slot="shopping-line"]').filter({ hasText: name })
const group = (page: Page, name: string) => page.getByRole('group', { name, exact: true })

test.describe('Lists', () => {
  test('NTE-007 1, 2, 3: Notes’ Lists, pinned first, each card its unticked lines', async ({
    page,
  }) => {
    await start(page, '/notes')
    await expect(page.getByRole('tablist', { name: 'View' }).getByRole('tab')).toHaveText([
      'Notes',
      'Thoughts',
      'Lists',
    ])
    await page.getByRole('tab', { name: 'Lists' }).click()
    await expect(page).toHaveURL(/\/notes\?tab=lists$/)
    // Garden is pinned; a done List isn't here.
    await expect(page.getByText('Pinned', { exact: true })).toBeVisible()
    await expect(page.locator('[data-slot="note-card"]')).toHaveText([/^Garden/, /^Lisbon/])
    await expect(card(page, 'Boots')).toHaveCount(0)
    // Its unticked lines, not its ticked one or its subheading; its Label.
    await expect(card(page, 'Lisbon')).toContainText('Sun cream')
    await expect(card(page, 'Lisbon')).toContainText('Swim shorts')
    await expect(card(page, 'Lisbon')).not.toContainText('Passport')
    await expect(card(page, 'Lisbon')).not.toContainText('Clothes')
    await expect(card(page, 'Lisbon')).toContainText('Travel')
    // Labels narrow it, as they do Notes (NTE-002).
    await page
      .getByRole('group', { name: 'Filter by label' })
      .getByRole('button', { name: 'Travel' })
      .click()
    await expect(page.locator('[data-slot="note-card"]')).toHaveText([/^Lisbon/])
  })

  test('NTE-007 1: New list, its name first, opens on its page', async ({ page }) => {
    const db = await start(page)
    await page.getByRole('button', { name: 'New list' }).first().click()
    const dialog = page.getByRole('dialog', { name: 'New list' })
    await expect(dialog.getByLabel('Name')).toBeFocused()
    // No date: a List has none (ADR-0069).
    await expect(dialog.getByText('Date')).toHaveCount(0)
    await dialog.getByLabel('Name').fill('Screwfix')
    await dialog.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByRole('heading', { name: 'Screwfix', level: 1 })).toBeVisible()
    await expect
      .poll(() => db.items.find((i) => i.title === 'Screwfix'))
      .toMatchObject({ type: 'list', do_on: null, status: 'active' })
    // Back to the page it came from, named so (useBack).
    await page.getByRole('button', { name: 'Notes', exact: true }).click()
    await expect(page).toHaveURL(/\/notes\?tab=lists$/)
    await expect(card(page, 'Screwfix')).toBeVisible()
  })

  test('NTE-006 3, 4: subheadings and lines, ticked in place', async ({ page }) => {
    const db = await start(page)
    await card(page, 'Lisbon').click()
    await expect(page.getByRole('heading', { name: 'Lisbon', level: 1 })).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/lists/${LISBON}$`))
    await expect(row(group(page, 'Clothes'), 'Swim shorts')).toBeVisible()
    await page.getByRole('textbox', { name: 'Add a subheading' }).fill('Wash bag')
    await page.keyboard.press('Enter')
    await group(page, 'Wash bag').getByRole('textbox', { name: 'Add to Wash bag' }).fill('Razor')
    await page.keyboard.press('Enter')
    await expect.poll(() => db.list_lines.find((l) => l.text === 'Razor')).toBeTruthy()
    const names = page.locator('[data-slot="shopping-line"] span.font-semibold')
    const before = await names.allTextContents()
    await row(page, 'Sun cream').getByRole('checkbox').click()
    await expect(row(page, 'Sun cream').getByRole('checkbox')).toBeChecked()
    expect(await names.allTextContents()).toEqual(before)
    await expect.poll(() => db.list_lines.find((l) => l.id === line(2))?.checked).toBe(true)
    // Removed from its "…" menu.
    await row(page, 'Razor').getByRole('button', { name: 'More' }).click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await expect.poll(() => db.list_lines.some((l) => l.text === 'Razor')).toBe(false)
  })

  test('NTE-006 5: ticking the last line asks to complete it; done, it leaves Lists', async ({
    page,
  }) => {
    const db = await start(page, `/lists/${GARDEN}`)
    await row(page, 'Mow').getByRole('checkbox').click()
    const ask = page.getByRole('alertdialog')
    await expect(ask).toContainText('Complete Garden?')
    await expect(ask).toContainText("Everything's ticked")
    // Not yet: it stays, ticked.
    await ask.getByRole('button', { name: 'Not yet' }).click()
    await expect(ask).toHaveCount(0)
    expect(db.items.find((i) => i.id === GARDEN)?.status).toBe('active')
    // Unticked and ticked again, it asks again; Complete finishes it.
    await row(page, 'Mow').getByRole('checkbox').click()
    await row(page, 'Mow').getByRole('checkbox').click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Complete' }).click()
    await expect(page).toHaveURL(/\/notes\?tab=lists$/)
    await expect.poll(() => db.items.find((i) => i.id === GARDEN)?.status).toBe('done')
    await expect(card(page, 'Garden')).toHaveCount(0)
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(card(page, 'Garden')).toBeVisible()
  })

  test('NTE-006 5: Complete list asks first while lines aren’t ticked; Not done brings it back', async ({
    page,
  }) => {
    const db = await start(page, `/lists/${LISBON}`)
    await page.getByRole('button', { name: 'More' }).first().click()
    await page.getByRole('menuitem', { name: 'Complete list' }).click()
    const ask = page.getByRole('alertdialog')
    await expect(ask).toContainText("2 items aren't ticked")
    await ask.getByRole('button', { name: 'Complete' }).click()
    await expect.poll(() => db.items.find((i) => i.id === LISBON)?.status).toBe('done')
    // Found again from Search: done, and Not done in its menu.
    await page.goto(`/lists/${LISBON}`)
    await expect(page.getByText('Done', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'More' }).first().click()
    await page.getByRole('menuitem', { name: 'Not done' }).click()
    await expect.poll(() => db.items.find((i) => i.id === LISBON)?.status).toBe('active')
  })

  test('NTE-007 3: a List pinned and labelled on its page; renamed in its details', async ({
    page,
  }) => {
    const db = await start(page, `/lists/${LISBON}`)
    await page.getByRole('button', { name: 'Pin' }).click()
    await expect.poll(() => db.marks.some((m) => m.item_id === LISBON)).toBe(true)
    await expect(page.getByText('Travel', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'More' }).first().click()
    await page.getByRole('menuitem', { name: 'Edit details…' }).click()
    const dialog = page.getByRole('dialog', { name: 'List details' })
    await dialog.getByLabel('Name').fill('Lisbon trip')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('heading', { name: 'Lisbon trip', level: 1 })).toBeVisible()
    await expect.poll(() => db.items.find((i) => i.id === LISBON)?.title).toBe('Lisbon trip')
  })

  test('NTE-007 4: a Thought becomes a List in place', async ({ page }) => {
    const db = await start(page, '/notes?tab=thoughts')
    await page
      .locator('[data-slot="item-row"]')
      .filter({ hasText: 'Packing for Rome' })
      .getByRole('button', { name: 'More' })
      .click()
    await page.getByRole('menuitem', { name: 'List' }).click()
    await expect(page.getByText('Converted into a List')).toBeVisible()
    await expect.poll(() => db.items.find((i) => i.id === line(900))?.type).toBe('list')
    await page.getByRole('tab', { name: 'Lists' }).click()
    await card(page, 'Packing for Rome').click()
    await expect(page.getByRole('heading', { name: 'Packing for Rome', level: 1 })).toBeVisible()
  })

  test('SRC-003 2: Search finds a List by name or by a line on it', async ({ page, isMobile }) => {
    await start(page, '/today')
    if (isMobile) await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    const input = page.getByRole('combobox', { name: 'Search' })
    const results = page.getByRole('listbox', { name: 'Search' })
    await input.fill('garden')
    await expect(results.getByRole('option', { name: /Garden/ })).toBeVisible()
    await input.fill('swim')
    await results.getByRole('option', { name: /Lisbon/ }).click()
    await expect(page.getByRole('heading', { name: 'Lisbon', level: 1 })).toBeVisible()
  })

  test('NTE-008 2: what someone else ticks and adds shows within a second or two', async ({
    page,
  }) => {
    const db = await start(page, `/lists/${GARDEN}`)
    await expect(row(page, 'Mow')).toBeVisible()
    await expect.poll(() => db.live.joined()).toBeGreaterThan(0)
    const mow = db.list_lines.find((l) => l.id === line(5))!
    mow.checked = true
    db.live.change('list_lines', 'UPDATE', mow, 'core')
    await expect(row(page, 'Mow').getByRole('checkbox')).toBeChecked({ timeout: 2000 })
    const weed = { ...mow, id: line(7), position: 'b', text: 'Weed', checked: false }
    db.list_lines.push(weed)
    db.live.change('list_lines', 'INSERT', weed, 'core')
    await expect(row(page, 'Weed')).toBeVisible({ timeout: 2000 })
    db.list_lines.splice(db.list_lines.indexOf(weed), 1)
    db.live.change('list_lines', 'DELETE', { id: weed.id }, 'core')
    await expect(row(page, 'Weed')).toHaveCount(0, { timeout: 2000 })
  })

  test('ADR-0069: old Shopping and Meal plan links open their new homes', async ({ page }) => {
    await start(page, '/shopping?tab=lists')
    await expect(page).toHaveURL(/\/notes\?tab=lists$/)
    await page.goto('/shopping')
    await expect(page).toHaveURL(/\/recipes\?tab=shop$/)
    await page.goto('/meal-plan?tab=pantry&view=pending')
    await expect(page.getByRole('heading', { name: 'Pending', level: 1 })).toBeVisible()
    await page.goto('/meal-plan')
    await expect(page).toHaveURL(/\/recipes\?tab=week$/)
  })
})
