import { expect, test, type Locator, type Page } from '@playwright/test'
import { itemRow, standIn } from './stand-in'

// Sunday 11 October 2026, 14:00 in London.
const NOW = new Date('2026-10-11T14:00:00+01:00')
const id = (n: number) => `01990000-0000-7000-8000-0000000000${String(n).padStart(2, '0')}`

test.use({ timezoneId: 'Europe/London', locale: 'en-GB' })

const rows = () => ({
  items: [
    itemRow({ id: id(1), type: 'task', title: 'Renew car insurance', due_on: '2026-10-08' }),
    itemRow({ id: id(2), type: 'task', title: 'Send passport photos', due_on: '2026-10-10' }),
    itemRow({ id: id(3), type: 'task', title: 'Call mum', do_on: '2026-10-11', do_at: '18:00:00' }),
    itemRow({ id: id(4), type: 'task', title: 'Pick up dry cleaning', do_on: '2026-10-08' }),
    itemRow({ id: id(5), type: 'task', title: 'Book Japan flights', do_on: '2026-10-16' }),
    itemRow({ id: id(6), type: 'thought', title: 'dentist tue 3pm?' }),
    itemRow({ id: id(7), type: 'thought', title: 'Ceramics class for the anniversary?' }),
    itemRow({ id: id(8), type: 'thought', title: 'Look into a standing desk' }),
    itemRow({ id: id(9), type: 'note', title: 'Boiler details' }),
    itemRow({ id: id(10), type: 'reminder', title: 'Move the car', do_on: '2026-10-11' }),
    itemRow({
      id: id(11),
      type: 'event',
      title: 'Stand-up',
      place: 'Zoom',
      starts_at: '2026-10-11T08:00:00Z',
      ends_at: '2026-10-11T08:15:00Z',
      all_day: false,
    }),
    itemRow({
      id: id(12),
      type: 'meal',
      title: 'Thai green curry',
      do_on: '2026-10-11',
      slot: 'dinner',
    }),
  ],
  marks: [{ item_id: id(3) }],
  alerts: [
    { id: 'a-1', item_id: id(10), anchor: 'do_on', offset_days: 0, at_time: '15:00:00' },
    {
      id: 'a-2',
      item_id: id(10),
      anchor: 'do_on',
      offset_days: 0,
      at_time: '15:40:00',
      alarm: true,
    },
  ],
})

async function start(page: Page, path = '/today') {
  await page.clock.setFixedTime(NOW)
  const db = await standIn(page, { signedIn: true, rows: rows(), clock: NOW })
  await page.goto(path)
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible()
  return db
}

const group = (page: Page, name: string) =>
  page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: new RegExp(`^${name}`) }) })
    .locator('[data-slot="item-row"]')
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

test('TDY-001, TDY-002, TDY-005: overdue, then the day in parts; no Thoughts; counted in the drawer', async ({
  page,
  isMobile,
}) => {
  await start(page)
  await expect(page.getByText('Sunday 11 October')).toBeVisible()
  await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText([
    'Overdue2',
    'Anytime',
    'Morning',
    'Afternoon',
    'Evening',
  ])
  await expect(group(page, 'Overdue')).toHaveText([
    /^Renew car insurance.*Due Thu 8 Oct$/,
    /Due yesterday/,
  ])
  await expect(group(page, 'Anytime')).toHaveText([/^Pick up dry cleaning.*Since Thu/])
  await expect(group(page, 'Morning')).toHaveText([/^Stand-up.*09:00–09:15·Zoom/])
  await expect(group(page, 'Afternoon')).toHaveText([/^Move the car.*15:00·15:40/])
  await expect(group(page, 'Afternoon').getByLabel('Alarm')).toBeVisible()
  await expect(group(page, 'Evening')).toHaveText([/^Thai green curry.*Dinner/, /^Call mum.*18:00/])
  // What has gone by stays, faded (TDY-003 2).
  await expect(rowOf(page, 'Stand-up')).toHaveCSS('opacity', '0.5')
  await expect(page.getByText('Book Japan flights')).toBeHidden()
  await expect(page.getByText('Boiler details')).toBeHidden()
  await expect(page.getByText('Look into a standing desk')).toBeHidden()
  await expect(page.getByRole('group', { name: 'Filter by label' })).toHaveCount(0)

  if (isMobile) await page.getByRole('button', { name: 'Menu' }).click()
  await expect(page.getByRole('link', { name: /^Today/ })).toContainText('7')
})

test('TDY-001 3: a quiet line says how many Thoughts wait, and opens them on Notes', async ({
  page,
}) => {
  await start(page)
  await page.getByRole('link', { name: '3 thoughts to sort' }).click()
  await expect(page).toHaveURL(/\/notes\?tab=thoughts$/)
  await expect(page.getByRole('tab', { name: 'Thoughts' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('[data-slot="item-row"]')).toHaveCount(3)
})

test('TDY-003, TDY-004: a Task ticked stays, struck through; moved to tomorrow it goes; both undoable', async ({
  page,
  isMobile,
}) => {
  const db = await start(page)
  const call = rowOf(page, 'Call mum')
  await call.getByRole('checkbox', { name: 'Done: Call mum' }).click()
  await expect.poll(() => db.items.find((i) => i.id === id(3))?.status).toBe('done')
  await expect(call.getByRole('checkbox', { name: 'Done: Call mum' })).toBeChecked()
  await expect(call.getByRole('button', { name: /^Call mum/ })).toHaveCSS(
    'text-decoration-line',
    'line-through',
  )
  // Struck through, never greyed (Joe, 14 November).
  await expect(call).toHaveCSS('opacity', '1')
  await call.getByRole('checkbox', { name: 'Done: Call mum' }).click()
  await expect.poll(() => db.items.find((i) => i.id === id(3))?.status).toBe('active')

  const cleaning = rowOf(page, 'Pick up dry cleaning')
  await rowAction(page, cleaning, 'Tomorrow', isMobile)
  await expect(cleaning).toBeHidden()
  await expect(page.getByText('Moved "Pick up dry cleaning" to tomorrow')).toBeVisible()
  await expect.poll(() => db.items.find((i) => i.id === id(4))?.do_on).toBe('2026-10-12')
})

test('TDY-004: a Reminder opens, and converts from its menu', async ({ page }) => {
  const db = await start(page)
  const car = rowOf(page, 'Move the car')
  await car.getByRole('button', { name: /^Move the car/ }).click()
  const popup = page.getByRole('dialog', { name: 'Move the car' })
  await expect(popup).toContainText('Reminder')
  await page.keyboard.press('Escape')
  await car.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Task' }).click()
  await expect(page.getByText('Converted into a Task')).toBeVisible()
  await expect.poll(() => db.items.find((i) => i.id === id(10))?.type).toBe('task')
})

test('TDY-003 2: a Meal never fades on Today; eaten, it is struck through', async ({ page }) => {
  await page.clock.setFixedTime(NOW)
  await standIn(page, {
    signedIn: true,
    rows: {
      items: [
        itemRow({
          id: id(1),
          type: 'meal',
          title: 'Porridge',
          do_on: '2026-10-11',
          slot: 'breakfast',
        }),
        itemRow({
          id: id(2),
          type: 'meal',
          title: 'Soup',
          do_on: '2026-10-11',
          slot: 'lunch',
          status: 'done',
        }),
      ],
    },
    clock: NOW,
  })
  await page.goto('/today')
  await expect(rowOf(page, 'Porridge')).toHaveCSS('opacity', '1')
  await expect(rowOf(page, 'Soup')).toHaveCSS('opacity', '1')
  await expect(rowOf(page, 'Soup').getByRole('button', { name: /^Soup/ })).toHaveCSS(
    'text-decoration-line',
    'line-through',
  )
})

test('TDY-004 4: on a phone, "+" adds a Task, an Event or a Reminder for today', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "The Fab is a phone's")
  await start(page)
  await page.getByRole('button', { name: 'Add to Today' }).click()
  await expect(page.getByRole('menuitem')).toHaveText(['Task', 'Event', 'Reminder'])
  await page.getByRole('menuitem', { name: 'Reminder' }).click()
  await expect(page.getByRole('dialog', { name: 'New reminder' })).toBeVisible()
})

test('TDY-001 5: with nothing today, it says so', async ({ page }) => {
  await page.clock.setFixedTime(NOW)
  await standIn(page, { signedIn: true, rows: { items: [] } })
  await page.goto('/today')
  await expect(page.getByRole('heading', { name: 'Nothing today' })).toBeVisible()
})

test('TDY-001 7: /inbox opens Today', async ({ page }) => {
  await start(page, '/today')
  await expect(page).toHaveURL(/\/today$/)
})
