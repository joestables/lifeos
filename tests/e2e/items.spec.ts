import { expect, test, type Page } from '@playwright/test'
import { itemRow, standIn, type Rows } from './stand-in'

const TASK = '01990000-0000-7000-8000-000000000001'
const NOTE = '01990000-0000-7000-8000-000000000002'
const THOUGHT = '01990000-0000-7000-8000-000000000003'
const GONE = '01990000-0000-7000-8000-000000000004'
const OLDER_GONE = '01990000-0000-7000-8000-000000000005'

/**
 * Goes to a page inside the app, as a link would, without reloading: a write
 * made a moment ago may not be stored on the device yet.
 */
const openInApp = (page: Page, path: string) =>
  page.evaluate((to) => {
    history.pushState({}, '', to)
    dispatchEvent(new PopStateEvent('popstate'))
  }, path)

const rows = (): Rows => ({
  items: [
    itemRow({ id: TASK, type: 'task', title: 'Renew car insurance', body: 'Admiral quoted £412' }),
    itemRow({
      id: NOTE,
      type: 'note',
      title: '',
      body: 'Boiler: Worcester Greenstar\nServiced March',
    }),
    itemRow({ id: THOUGHT, type: 'thought', title: 'ceramics class?' }),
    itemRow({
      id: GONE,
      type: 'thought',
      title: 'buy oat milk',
      archived_at: new Date().toISOString(),
    }),
    itemRow({
      id: OLDER_GONE,
      type: 'task',
      title: 'Water the plants',
      archived_at: '2026-10-05T10:00:00Z',
    }),
  ],
  labels: [
    { id: 'l-car', name: 'Car' },
    { id: 'l-home', name: 'Home' },
  ],
  item_labels: [
    { item_id: TASK, label_id: 'l-car' },
    { item_id: NOTE, label_id: 'l-home' },
  ],
})

test('ITM-001: an Item has a link of its own; a Task opens in a popup, and closes back to the page', async ({
  page,
}) => {
  await standIn(page, { signedIn: true, rows: rows() })
  await page.goto(`/item/${TASK}`)
  await expect(page).toHaveURL(new RegExp(`/tasks\\?item=${TASK}$`))
  const popup = page.getByRole('dialog', { name: 'Renew car insurance' })
  await expect(popup).toContainText('Task')
  await expect(popup).toContainText('Admiral quoted £412')
  await popup.getByRole('button', { name: 'Close' }).click()
  await expect(popup).toBeHidden()
  await expect(page).toHaveURL(/\/tasks$/)
  await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible()
})

test('ITM-001: a Note opens in a popup on a computer, and on its own page on a phone', async ({
  page,
  isMobile,
}) => {
  await standIn(page, { signedIn: true, rows: rows() })
  await page.goto('/notes')
  await page.goto(`/item/${NOTE}`)
  if (isMobile) {
    await expect(page.getByRole('heading', { name: 'Boiler: Worcester Greenstar' })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByRole('button', { name: 'Notes' }).click()
    await expect(page).toHaveURL(/\/notes$/)
  } else {
    await expect(page.getByRole('dialog', { name: 'Boiler: Worcester Greenstar' })).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/notes\\?item=${NOTE}$`))
  }
})

test("ITM-001: a link to an Item I can't see says it can't be found", async ({ page }) => {
  await standIn(page, { signedIn: true, rows: rows() })
  await page.goto('/item/01990000-0000-7000-8000-0000000000ff')
  await expect(page.getByRole('heading', { name: "This can't be found" })).toBeVisible()
  await page.goto('/inbox?item=01990000-0000-7000-8000-0000000000ff')
  await expect(page.getByRole('dialog', { name: "This can't be found" })).toBeVisible()
})

test('ITM-002, ITM-003: deleting is undoable at once, and recoverable later from Settings', async ({
  page,
}) => {
  await standIn(page, { signedIn: true, rows: rows() })
  await page.goto(`/tasks?item=${TASK}`)
  const popup = page.getByRole('dialog', { name: 'Renew car insurance' })
  await popup.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await expect(popup).toBeHidden()
  const toast = page.getByText('Deleted "Renew car insurance"')
  await expect(toast).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()
  await openInApp(page, `/tasks?item=${TASK}`)
  await expect(page.getByRole('dialog', { name: 'Renew car insurance' })).toBeVisible()

  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await openInApp(page, '/settings/deleted')
  const rowsShown = page.locator('[data-slot="item-row"]')
  await expect(rowsShown).toHaveCount(3)
  await expect(rowsShown.first()).toContainText('Renew car insurance')
  await expect(rowsShown.first()).toContainText('Task')
  await expect(rowsShown.first()).toContainText('Deleted Just now')
  await expect(rowsShown.last()).toContainText('Water the plants')
  await expect(rowsShown.last()).toContainText('Deleted Mon 5 Oct')

  await rowsShown.first().getByRole('button', { name: 'Restore' }).click()
  await expect(page.getByText('Restored "Renew car insurance"')).toBeVisible()
  await expect(rowsShown).toHaveCount(2)
  await openInApp(page, `/tasks?item=${TASK}`)
  await expect(page.getByRole('dialog', { name: 'Renew car insurance' })).toBeVisible()
})

test('ITM-004: an Item converts only into Types the app has, keeping what it holds', async ({
  page,
}) => {
  await standIn(page, { signedIn: true, rows: rows() })
  await page.goto(`/inbox?item=${THOUGHT}`)
  const popup = page.getByRole('dialog', { name: 'ceramics class?' })
  await expect(popup).toContainText('Thought')
  await popup.getByRole('button', { name: 'More' }).click()
  const menu = page.getByRole('menu')
  await expect(menu.getByRole('menuitem')).toHaveText(['Note', 'Task', 'Delete'])
  await menu.getByRole('menuitem', { name: 'Task' }).click()
  await expect(page.getByText('Converted into a Task')).toBeVisible()
  await expect(popup).toContainText('Task')
  await expect(popup.getByRole('button', { name: 'Star' })).toBeVisible()

  await popup.getByRole('button', { name: 'More' }).click()
  await expect(page.getByRole('menu').getByRole('menuitem')).toHaveText(['Delete'])
})

test('TSK-005, NTE-003: a Task is starred and a Note pinned from where it opens', async ({
  page,
  isMobile,
}) => {
  await standIn(page, { signedIn: true, rows: rows() })
  await page.goto(`/item/${TASK}`)
  const star = page.getByRole('dialog').getByRole('button', { name: 'Star' })
  await expect(star).toHaveAttribute('aria-pressed', 'false')
  await star.click()
  await expect(star).toHaveAttribute('aria-pressed', 'true')
  await page.goto(`/item/${NOTE}`)
  const pin = (isMobile ? page.getByRole('main') : page.getByRole('dialog')).getByRole('button', {
    name: 'Pin',
  })
  await pin.click()
  await expect(pin).toHaveAttribute('aria-pressed', 'true')
})

test('ITM-005: Labels are renamed and deleted in Settings, and their Items kept', async ({
  page,
  isMobile,
}) => {
  await standIn(page, { signedIn: true, rows: rows() })
  await page.goto('/settings')
  if (isMobile) {
    await page.getByRole('link', { name: /Labels/ }).click()
    await expect(page).toHaveURL(/\/settings\/labels$/)
  }
  const labels = page.getByRole('main')
  await labels.getByRole('button', { name: 'Car options' }).click()
  await page.getByRole('menuitem', { name: 'Rename' }).click()
  const rename = page.getByRole('dialog', { name: 'Rename label' })
  await rename.getByLabel('Name').fill('Vehicles')
  await rename.getByRole('button', { name: 'Save' }).click()
  await expect(labels.getByText('Vehicles')).toBeVisible()

  await labels.getByRole('button', { name: 'Home options' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  const confirm = page.getByRole('alertdialog')
  await expect(confirm).toContainText('Delete "Home"?')
  await expect(confirm).toContainText('It comes off 1 item')
  await confirm.getByRole('button', { name: 'Delete' }).click()
  await expect(labels.getByText('Home', { exact: true })).toBeHidden()
  await page.goto(`/item/${NOTE}`)
  await expect(page.getByRole('heading', { name: 'Boiler: Worcester Greenstar' })).toBeVisible()

  await page.goto('/settings')
  if (isMobile) await page.getByRole('link', { name: /Labels/ }).click()
  await page.getByRole('button', { name: 'New label' }).click()
  const add = page.getByRole('dialog', { name: 'New label' })
  await add.getByLabel('Name').fill('vehicles')
  await add.getByRole('button', { name: 'Save' }).click()
  await expect(labels.getByText(/^vehicles$/i)).toHaveCount(1)
})

test('OFF-005: offline, what was loaded still shows, marked as possibly out of date', async ({
  page,
  context,
}) => {
  await standIn(page, { signedIn: true, rows: rows() })
  await page.goto(`/item/${TASK}`)
  await expect(page.getByRole('dialog', { name: 'Renew car insurance' })).toBeVisible()
  await context.setOffline(true)
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Offline' })).toContainText(
    'These may be out of date',
  )
  // Open it again from inside the app, as a link in a list would.
  await openInApp(page, `/tasks?item=${TASK}`)
  await expect(page.getByRole('dialog', { name: 'Renew car insurance' })).toBeVisible()
})
