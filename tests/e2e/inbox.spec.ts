import { expect, test, type Locator, type Page, type Route } from '@playwright/test'
import { itemRow, standIn } from './stand-in'

// Sunday 11 October 2026, 14:00 in London.
const NOW = new Date('2026-10-11T14:00:00+01:00')
const id = (n: number) => `01990000-0000-7000-8000-0000000000${String(n).padStart(2, '0')}`

test.use({ timezoneId: 'Europe/London' })

const rows = () => ({
  items: [
    itemRow({ id: id(1), type: 'task', title: 'Renew car insurance', due_on: '2026-10-08' }),
    itemRow({ id: id(2), type: 'task', title: 'Send passport photos', due_on: '2026-10-10' }),
    itemRow({ id: id(3), type: 'task', title: 'Call mum', do_on: '2026-10-11', do_at: '18:00:00' }),
    itemRow({ id: id(4), type: 'task', title: 'Pick up dry cleaning', do_on: '2026-10-08' }),
    itemRow({ id: id(5), type: 'task', title: 'Book Japan flights', do_on: '2026-10-16' }),
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
    itemRow({ id: id(9), type: 'note', title: 'Boiler details' }),
  ],
  labels: [
    { id: 'l-car', name: 'Car' },
    { id: 'l-family', name: 'Family' },
  ],
  item_labels: [
    { item_id: id(1), label_id: 'l-car' },
    { item_id: id(7), label_id: 'l-family' },
  ],
  marks: [{ item_id: id(3) }],
  alerts: [{ id: 'r-6', item_id: id(6), fires_at: '2026-10-13T14:00:00Z', is_default: false }],
})

async function start(page: Page) {
  await page.clock.setFixedTime(NOW)
  const db = await standIn(page, { signedIn: true, rows: rows() })
  await page.goto('/inbox')
  await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible()
  return db
}

const group = (page: Page, name: string) =>
  page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: new RegExp(`^${name}`) }) })
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

test('INB-001, INB-003, INB-005: what needs me, in three groups, counted in the drawer', async ({
  page,
  isMobile,
}) => {
  await start(page)
  const headings = page.getByRole('main').getByRole('heading', { level: 2 })
  await expect(headings).toHaveText(['Overdue2', 'Today2', 'Thoughts3'])

  const overdue = group(page, 'Overdue').locator('[data-slot="item-row"]')
  await expect(overdue).toHaveCount(2)
  await expect(overdue.first()).toContainText('Renew car insurance')
  await expect(overdue.first()).toContainText('Due Thu 8 Oct·Car')
  await expect(overdue.last()).toContainText('Due yesterday')

  const today = group(page, 'Today').locator('[data-slot="item-row"]')
  await expect(today.first()).toContainText('Call mum18:00')
  await expect(today.first().getByRole('button', { name: 'Star' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(today.last()).toContainText('Since Thu')
  await expect(page.getByText('Book Japan flights')).toBeHidden()

  const thoughts = group(page, 'Thoughts').locator('[data-slot="item-row"]')
  await expect(thoughts).toHaveText([
    /^Ceramics class.*08:12·Family/,
    /^dentist tue 3pm\?.*07:40·Tue 15:00/,
    /Yesterday/,
  ])
  await expect(page.getByText('Boiler details')).toBeHidden()

  if (isMobile) await page.getByRole('button', { name: 'Menu' }).click()
  await expect(page.getByRole('link', { name: /^Inbox/ })).toContainText('7')
})

test('INB-002: a Thought becomes a Task in one action, its date understood, and leaves Inbox', async ({
  page,
  isMobile,
}) => {
  const db = await start(page)
  const thought = rowOf(page, 'dentist tue 3pm?')
  // Whether its own Alert goes depends on the Alerts: converted once the
  // page has them, as its row then shows.
  await expect(thought).toContainText('15:00')
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
  // The Task's own Alert fires at 15:00 on Tuesday: the Thought's isn't kept as well.
  await expect.poll(() => db.alerts.length).toBe(0)
})

test('INB-002: a Thought becomes a Note, with Undo, or is deleted with Undo', async ({
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

test('INB-003, INB-004: tick a Task done, or move it to tomorrow; both undoable', async ({
  page,
  isMobile,
}) => {
  const db = await start(page)
  const call = rowOf(page, 'Call mum')
  await call.getByRole('checkbox', { name: 'Done: Call mum' }).click()
  await expect(call).toBeHidden()
  await expect.poll(() => db.items.find((i) => i.id === id(3))?.status).toBe('done')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(call).toBeVisible()

  const cleaning = rowOf(page, 'Pick up dry cleaning')
  await rowAction(page, cleaning, 'Tomorrow', isMobile)
  await expect(cleaning).toBeHidden()
  await expect(page.getByText('Moved "Pick up dry cleaning" to tomorrow')).toBeVisible()
  await expect.poll(() => db.items.find((i) => i.id === id(4))?.do_on).toBe('2026-10-12')
})

test('INB-001: sorting works with no signal, and a row opens its Item', async ({
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

test('Inbox with nothing in it says so', async ({ page }) => {
  await page.clock.setFixedTime(NOW)
  await standIn(page, { signedIn: true, rows: { items: [] } })
  await page.goto('/inbox')
  await expect(page.getByRole('heading', { name: 'Nothing needs you' })).toBeVisible()
})

const chip = (page: Page, name: string) =>
  page.getByRole('group', { name: 'Filter by label' }).getByRole('button', { name })

test('INB-006: a Thought ticked off leaves Inbox, with Undo', async ({ page, isMobile }) => {
  const db = await start(page)
  const desk = rowOf(page, 'Look into a standing desk')
  await desk.getByRole('checkbox', { name: 'Done: Look into a standing desk' }).click()
  await expect(desk).toBeHidden()
  await expect.poll(() => db.items.find((i) => i.id === id(8))?.status).toBe('done')
  await expect(page.getByRole('heading', { name: /^Thoughts/ })).toHaveText('Thoughts2')
  if (!isMobile) await expect(page.getByRole('link', { name: /^Inbox/ })).toContainText('6')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(desk).toBeVisible()
  await expect.poll(() => db.items.find((i) => i.id === id(8))?.status).toBe('active')
})

test('INB-007: Labels narrow every group; what has no Label leaves while one is chosen', async ({
  page,
}) => {
  await start(page)
  await expect(page.getByRole('group', { name: 'Filter by label' }).getByRole('button')).toHaveText(
    ['Car', 'Family'],
  )
  await chip(page, 'Family').click()
  await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText(['Thoughts1'])
  await expect(page.locator('[data-slot="item-row"]')).toHaveText([/^Ceramics class/])
  await chip(page, 'Car').click()
  await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText([
    'Overdue1',
    'Thoughts1',
  ])
  await chip(page, 'Car').click()
  await chip(page, 'Family').click()
  await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText([
    'Overdue2',
    'Today2',
    'Thoughts3',
  ])
})
