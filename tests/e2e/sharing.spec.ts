import { expect, test, type Page } from '@playwright/test'
import { ANN, itemRow, standIn, type Rows } from './stand-in'

// Tasks and Events shared with a Household (HSH-005; Joe, 4 November).
// Monday 12 October 2026, 09:00 in London.
const NOW = new Date('2026-10-12T09:00:00+01:00')
const HOME = '00000000-0000-7000-8000-0000000000f1'
const SAM = '00000000-0000-4000-8000-0000000000aa'
const id = (n: number) => `01990000-0000-7000-8000-0000000003${String(n).padStart(2, '0')}`
const DINNER = id(1)
const SAMS_TASK = id(2)
const MY_TASK = id(3)
const BINS = id(4)

test.use({ timezoneId: 'Europe/London' })

function rows(household = true): Rows {
  return {
    ...(household && {
      spaces: [{ id: HOME, name: 'Home', created_by: ANN.id }],
      space_members: [
        { space_id: HOME, person_id: ANN.id, role: 'owner', name: ANN.name },
        { space_id: HOME, person_id: SAM, role: 'member', name: 'Sam Carter' },
      ],
    }),
    items: [
      itemRow({
        id: DINNER,
        type: 'event',
        title: 'Dinner at Mum’s',
        space_id: HOME,
        owner_id: SAM,
        starts_at: '2026-10-14T17:00:00Z',
        ends_at: '2026-10-14T20:00:00Z',
        all_day: false,
      }),
      // Sam's own Task for the shared Dinner: seen through the link only.
      itemRow({
        id: SAMS_TASK,
        type: 'task',
        title: 'Buy flowers',
        space_id: 'sam-personal',
        owner_id: SAM,
        do_on: '2026-10-12',
      }),
      // Mine, for the Dinner too: visible to Home.
      itemRow({ id: MY_TASK, type: 'task', title: 'Bake a cake', do_on: '2026-10-12' }),
      // A shared chore Sam made.
      itemRow({
        id: BINS,
        type: 'task',
        title: 'Put the bins out',
        space_id: HOME,
        owner_id: SAM,
        do_on: '2026-10-12',
      }),
    ],
    links: [
      { from_item: SAMS_TASK, to_item: DINNER, link_type: 'for' },
      { from_item: MY_TASK, to_item: DINNER, link_type: 'for' },
    ],
  }
}

async function start(page: Page, path: string, household = true) {
  await page.clock.setFixedTime(NOW)
  const db = await standIn(page, { signedIn: true, rows: rows(household) })
  await page.goto(path)
  return db
}

const rowOf = (page: Page, title: string) =>
  page.locator('[data-slot="item-row"]').filter({ hasText: title })

test('HSH-005 1, 2: New task is made for a Household from the Space at its foot', async ({
  page,
}) => {
  const db = await start(page, '/tasks')
  await page.getByRole('button', { name: 'New task' }).click()
  const dialog = page.getByRole('dialog', { name: 'New task' })
  await dialog.getByRole('textbox', { name: 'Title' }).fill('Water the plants')
  // Space is the last field.
  await expect(dialog.locator('[data-slot="label"]').last()).toHaveText('Space')
  await dialog.getByRole('combobox', { name: 'Space' }).click()
  await page.getByRole('option', { name: 'Home' }).click()
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(rowOf(page, 'Water the plants')).toContainText('Home')
  await expect.poll(() => db.items.find((i) => i.title === 'Water the plants')?.space_id).toBe(HOME)
})

test('HSH-005 1: no Space without a Household', async ({ page }) => {
  await start(page, '/tasks', false)
  await page.getByRole('button', { name: 'New task' }).click()
  const dialog = page.getByRole('dialog', { name: 'New task' })
  await expect(dialog.getByRole('combobox', { name: 'Space' })).toHaveCount(0)
})

test('HSH-005 2, 3: a shared Task is in my Inbox and Tasks, saying so; only its maker moves it', async ({
  page,
}) => {
  await start(page, '/inbox')
  await expect(rowOf(page, 'Put the bins out')).toContainText('Home')
  await rowOf(page, 'Put the bins out').getByText('Put the bins out').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('checkbox', { name: 'Done' })).toBeVisible()
  await expect(dialog.getByRole('combobox', { name: 'Space' })).toHaveCount(0)
})

test('HSH-005 7: someone else’s Task seen through a link isn’t mine: read-only, out of Inbox and Tasks', async ({
  page,
}) => {
  await start(page, '/inbox')
  await expect(rowOf(page, 'Bake a cake')).toBeVisible()
  await expect(rowOf(page, 'Buy flowers')).toHaveCount(0)
  await page.goto(`/tasks?item=${SAMS_TASK}`)
  await expect(rowOf(page, 'Buy flowers')).toHaveCount(0)
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Sam’s')
  await expect(dialog).toContainText('Buy flowers')
  await expect(dialog.getByRole('checkbox')).toHaveCount(0)
  await expect(dialog.getByRole('textbox')).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: 'More' })).toHaveCount(0)
})

test('ADR-0016: my Personal Task linked to a shared Event says it is visible to the Household', async ({
  page,
}) => {
  await start(page, `/tasks?item=${MY_TASK}`)
  await expect(page.getByRole('dialog')).toContainText('Visible to Home')
})

test('EVT-001 1: an Event’s Reminders sit just below its end; its Space last', async ({ page }) => {
  await start(page, `/plan?item=${DINNER}`)
  const dialog = page.getByRole('dialog')
  const labels = dialog.locator('[data-slot="label"]')
  await expect(labels.filter({ hasText: 'Place' })).toBeVisible()
  const names = await labels.allTextContents()
  expect(names.indexOf('Reminders')).toBeLessThan(names.indexOf('Place'))
  expect(names.indexOf('Ends')).toBeLessThan(names.indexOf('Reminders'))
  // Sam made it, so there is no Space for me to change.
  await expect(dialog.getByRole('combobox', { name: 'Space' })).toHaveCount(0)
  // Sam's own Task for it says whose, and isn't mine to tick.
  const theirs = dialog.locator('[data-slot="item-row"]').filter({ hasText: 'Buy flowers' })
  await expect(theirs).toContainText('Sam’s')
  await expect(theirs.getByRole('checkbox')).toBeDisabled()
  const mine = dialog.locator('[data-slot="item-row"]').filter({ hasText: 'Bake a cake' })
  await expect(mine.getByRole('checkbox')).toBeEnabled()
})
