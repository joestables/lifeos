import { expect, test, type Locator, type Page, type Route } from '@playwright/test'
import { itemRow, standIn } from './stand-in'

// Sunday 11 October 2026, 14:00 in London.
const NOW = new Date('2026-10-11T14:00:00+01:00')
const id = (n: number) => `01990000-0000-7000-8000-0000000000${String(n).padStart(2, '0')}`

test.use({ timezoneId: 'Europe/London', locale: 'en-GB' })

const rows = () => ({
  items: [
    itemRow({
      id: id(6),
      type: 'thought',
      title: 'dentist tue 3pm?',
      created_at: '2026-10-11T06:40:00Z',
    }),
    itemRow({
      id: id(7),
      type: 'thought',
      title: 'Ceramics class for the anniversary?',
      created_at: '2026-10-11T07:12:00Z',
    }),
    itemRow({
      id: id(8),
      type: 'thought',
      title: 'Look into a standing desk',
      created_at: '2026-10-10T09:00:00Z',
    }),
    itemRow({
      id: id(5),
      type: 'thought',
      title: 'An old idea',
      status: 'done',
      created_at: '2026-10-01T09:00:00Z',
    }),
    itemRow({ id: id(9), type: 'note', title: 'Boiler details' }),
  ],
  labels: [
    { id: 'l-car', name: 'Car' },
    { id: 'l-family', name: 'Family' },
  ],
  item_labels: [{ item_id: id(7), label_id: 'l-family' }],
})

async function start(page: Page) {
  await page.clock.setFixedTime(NOW)
  const db = await standIn(page, { signedIn: true, rows: rows(), clock: NOW })
  await page.goto('/notes?tab=thoughts')
  await expect(page.getByRole('tab', { name: 'Thoughts' })).toHaveAttribute('aria-selected', 'true')
  return db
}

const rowOf = (page: Page, title: string) =>
  page.locator('[data-slot="item-row"]').filter({ hasText: title })

/** The row's own action: a hover button on a computer, the "…" menu on a phone. */
async function rowAction(page: Page, row: Locator, name: string, isMobile: boolean) {
  if (isMobile) {
    await row.getByRole('button', { name: 'More' }).click()
    await page.getByRole('menuitem', { name }).click()
  } else {
    await row.hover()
    await row.getByRole('button', { name, exact: true }).click()
  }
}

test('NTE-005 1, 2: Notes and Thoughts tabs; Thoughts not ticked off, newest first', async ({
  page,
}) => {
  await start(page)
  await expect(page.getByRole('tablist', { name: 'View' }).getByRole('tab')).toHaveText([
    'Notes',
    'Thoughts',
  ])
  await expect(page.locator('[data-slot="item-row"]')).toHaveText([
    /^Ceramics class.*08:12·Family/,
    /^dentist tue 3pm\?.*07:40/,
    /Yesterday/,
  ])
  await expect(page.getByText('Boiler details')).toBeHidden()
  await page.getByRole('tab', { name: 'Notes' }).click()
  await expect(page).toHaveURL(/\/notes$/)
  await expect(page.getByText('Boiler details')).toBeVisible()
})

test('NTE-005 1: Labels narrow the Thoughts', async ({ page }) => {
  await start(page)
  await page
    .getByRole('group', { name: 'Filter by label' })
    .getByRole('button', { name: 'Family' })
    .click()
  await expect(page.locator('[data-slot="item-row"]')).toHaveText([/^Ceramics class/])
})

test('NTE-005 3, INB-002: a Thought becomes a Task in one action, its date understood', async ({
  page,
  isMobile,
}) => {
  const db = await start(page)
  const thought = rowOf(page, 'dentist tue 3pm?')
  if (isMobile) {
    // A swipe to the right, with a finger.
    const box = (await thought.boundingBox())!
    const y = box.y + box.height / 2
    const swipe = page.locator('[data-slot="swipe-action"]').filter({ has: thought })
    await swipe.dispatchEvent('pointerdown', {
      pointerType: 'touch',
      pointerId: 1,
      clientX: box.x + 20,
      clientY: y,
      isPrimary: true,
    })
    for (const x of [40, 80, 120, 150])
      await swipe.dispatchEvent('pointermove', {
        pointerType: 'touch',
        pointerId: 1,
        clientX: box.x + 20 + x,
        clientY: y,
        isPrimary: true,
      })
    await swipe.dispatchEvent('pointerup', {
      pointerType: 'touch',
      pointerId: 1,
      clientX: box.x + 170,
      clientY: y,
      isPrimary: true,
    })
  } else {
    await rowAction(page, thought, 'Task', isMobile)
  }
  await expect(page.getByText('Converted into a Task')).toBeVisible()
  await expect(thought).toBeHidden()
  await expect
    .poll(() => db.items.find((i) => i.id === id(6)))
    .toMatchObject({ type: 'task', title: 'Dentist?', do_on: '2026-10-13', do_at: '15:00' })
})

test('NTE-005 3: a Thought becomes a Reminder in one action, at the time it names', async ({
  page,
  isMobile,
}) => {
  const db = await start(page)
  await rowAction(page, rowOf(page, 'dentist tue 3pm?'), 'Reminder', isMobile)
  await expect(page.getByText('Converted into a Reminder')).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Dentist?' })).toContainText('Tue 15:00')
  await expect.poll(() => db.items.find((i) => i.id === id(6))?.type).toBe('reminder')
})

test('NTE-005 3: a Thought becomes a Note, with Undo, or is deleted with Undo', async ({
  page,
  isMobile,
}) => {
  const db = await start(page)
  const desk = rowOf(page, 'Look into a standing desk')
  await rowAction(page, desk, 'Note', isMobile)
  await expect(desk).toBeHidden()
  await expect.poll(() => db.items.find((i) => i.id === id(8))?.type).toBe('note')
  await page
    .locator('[data-sonner-toast]')
    .filter({ hasText: 'Converted into a Note' })
    .getByRole('button', { name: 'Undo' })
    .click()
  await expect(desk).toBeVisible()
  await expect.poll(() => db.items.find((i) => i.id === id(8))?.type).toBe('thought')

  const ceramics = rowOf(page, 'Ceramics class')
  await ceramics.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await expect(ceramics).toBeHidden()
  await page
    .locator('[data-sonner-toast]')
    .filter({ hasText: 'Deleted' })
    .getByRole('button', { name: 'Undo' })
    .click()
  await expect(ceramics).toBeVisible()
})

test('INB-006: a Thought ticked off leaves, with Undo', async ({ page }) => {
  const db = await start(page)
  const desk = rowOf(page, 'Look into a standing desk')
  await desk.getByRole('checkbox', { name: 'Done: Look into a standing desk' }).click()
  await expect(desk).toBeHidden()
  await expect.poll(() => db.items.find((i) => i.id === id(8))?.status).toBe('done')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(desk).toBeVisible()
  await expect.poll(() => db.items.find((i) => i.id === id(8))?.status).toBe('active')
})

test('NTE-005: sorting works with no signal, and a row opens its Thought', async ({
  page,
  context,
  isMobile,
}) => {
  await start(page)
  const noSignal = (route: Route) => route.abort('internetdisconnected')
  await page.route('**/rest/v1/rpc/**', noSignal)
  await context.setOffline(true)
  const desk = rowOf(page, 'Look into a standing desk')
  await rowAction(page, desk, 'Note', isMobile)
  await expect(desk).toBeHidden()

  await rowOf(page, 'Ceramics class')
    .getByRole('button', { name: /^Ceramics class/ })
    .click()
  await expect(
    page.getByRole('dialog', { name: 'Ceramics class for the anniversary?' }),
  ).toBeVisible()
})

test('NTE-005 4: New thought opens "New"', async ({ page, isMobile }) => {
  await start(page)
  if (isMobile) await page.getByRole('button', { name: 'New thought' }).click()
  else await page.getByRole('button', { name: 'New thought' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})
