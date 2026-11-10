import { expect, test, type Page } from '@playwright/test'
import { itemRow, standIn } from './stand-in'

// Wednesday 14 October 2026, 10:00 in London.
const NOW = new Date('2026-10-14T10:00:00+01:00')
const id = (n: number) => `01990000-0000-7000-8000-0000000004${String(n).padStart(2, '0')}`

test.use({ timezoneId: 'Europe/London', locale: 'en-GB' })

const rows = () => ({
  items: [
    itemRow({ id: id(1), type: 'task', title: 'Call mum', do_on: '2026-10-13', do_at: '18:00:00' }),
    itemRow({ id: id(2), type: 'task', title: 'Pay the plumber', do_on: '2026-10-13' }),
    itemRow({ id: id(3), type: 'task', title: 'Book Japan flights', due_on: '2026-10-14' }),
    itemRow({
      id: id(4),
      type: 'event',
      title: 'Annual leave',
      starts_at: '2026-10-15T00:00:00Z',
      ends_at: '2026-10-16T00:00:00Z',
      all_day: true,
    }),
    itemRow({
      id: id(5),
      type: 'event',
      title: 'Dinner with Sam',
      place: 'Dishoom',
      starts_at: '2026-10-16T18:30:00Z',
      ends_at: '2026-10-16T20:30:00Z',
      all_day: false,
    }),
    itemRow({
      id: id(6),
      type: 'event',
      title: 'Edinburgh',
      starts_at: '2026-10-17T00:00:00Z',
      ends_at: '2026-10-20T00:00:00Z',
      all_day: true,
    }),
    itemRow({ id: id(7), type: 'task', title: 'Fix the gate' }),
    itemRow({
      id: id(8),
      type: 'task',
      title: 'Learn Japanese',
      do_on: '2026-10-15',
      status: 'idea',
    }),
    itemRow({
      id: id(9),
      type: 'task',
      title: 'Take the bins out',
      do_on: '2026-10-12',
      status: 'done',
    }),
    itemRow({
      id: id(10),
      type: 'task',
      title: 'Recycling',
      do_on: '2026-10-12',
      status: 'cancelled',
      series_id: 's1',
      occurrence_on: '2026-10-12',
    }),
    itemRow({
      id: id(11),
      type: 'task',
      title: 'Recycling',
      do_on: '2026-10-19',
      series_id: 's1',
      occurrence_on: '2026-10-19',
    }),
    itemRow({ id: id(12), type: 'note', title: 'Boiler details' }),
  ],
})

async function start(page: Page, path = '/plan') {
  await page.clock.setFixedTime(NOW)
  const db = await standIn(page, { signedIn: true, rows: rows() })
  await page.goto(path)
  await expect(page.getByRole('heading', { name: 'Plan', level: 1 })).toBeVisible()
  return db
}

const day = (page: Page, name: string) => page.getByRole('group', { name, exact: true })
const cards = (scope: ReturnType<Page['locator']>) => scope.locator('[data-slot="plan-card"]')

test.describe('on a computer', () => {
  test.skip(({ isMobile }) => isMobile, 'The week is a computer’s')

  test('PLN-001: the week, each Item on its days, untimed first, then by time', async ({
    page,
  }) => {
    await start(page)
    await expect(page.getByRole('heading', { level: 2, name: /12 – 18 October/ })).toBeVisible()
    await expect(cards(day(page, 'Mon 12'))).toHaveText([/Take the bins out/])
    await expect(cards(day(page, 'Tue 13'))).toHaveText([/Pay the plumber/, /Call mum.*18:00/])
    await expect(cards(day(page, 'Wed 14'))).toHaveText([/Book Japan flights.*Due today/])
    await expect(cards(day(page, 'Thu 15'))).toHaveText([/Annual leave.*All day/])
    await expect(cards(day(page, 'Fri 16'))).toHaveText([/Dinner with Sam.*19:30 · Dishoom/])
    await expect(cards(day(page, 'Sat 17'))).toHaveText([/Edinburgh.*All day · Until Mon/])
    await expect(cards(day(page, 'Sun 18'))).toHaveText([/Edinburgh/])
    // Not on Plan: no date, Someday, skipped, a Note.
    for (const title of ['Fix the gate', 'Learn Japanese', 'Boiler details'])
      await expect(page.getByText(title)).toHaveCount(0)
    await expect(page.getByText('Recycling')).toHaveCount(0)

    await page.getByRole('button', { name: 'Next week' }).click()
    await expect(page.getByRole('heading', { level: 2, name: /19 – 25 October/ })).toBeVisible()
    await expect(cards(day(page, 'Mon 19'))).toHaveText([/Edinburgh/, /Recycling/])
  })

  test('PLN-002, PLN-003: a day, kept on this computer; moving through time', async ({ page }) => {
    await start(page)
    await page.getByRole('button', { name: 'Day', exact: true }).click()
    await expect(
      page.getByRole('heading', { level: 2, name: /Wednesday 14 October/ }),
    ).toBeVisible()
    await page.getByRole('tab', { name: /Fri/ }).click()
    await expect(page.getByRole('heading', { level: 2, name: /Friday 16 October/ })).toBeVisible()
    await expect(cards(page.getByRole('main'))).toHaveText([
      /Dinner with Sam.*19:30–21:30 · Dishoom/,
    ])
    await page.getByRole('button', { name: 'Next day' }).click()
    await expect(page.getByRole('heading', { level: 2, name: /Saturday 17 October/ })).toBeVisible()
    await page.getByRole('button', { name: 'Today' }).click()
    await expect(
      page.getByRole('heading', { level: 2, name: /Wednesday 14 October/ }),
    ).toBeVisible()

    await page.reload()
    await expect(
      page.getByRole('heading', { level: 2, name: /Wednesday 14 October/ }),
    ).toBeVisible()

    // Choosing a date shows it.
    await page.getByRole('heading', { level: 2 }).getByRole('button').click()
    await page.getByRole('button', { name: /October 28/ }).click()
    await expect(
      page.getByRole('heading', { level: 2, name: /Wednesday 28 October/ }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Week', exact: true }).click()
    await expect(
      page.getByRole('heading', { level: 2, name: /26 October – 1 November/ }),
    ).toBeVisible()
  })

  test('PLN-006: a day’s "+" adds a Task or an Event on that day', async ({ page }) => {
    const db = await start(page)
    const thu = day(page, 'Thu 15')
    await thu.hover()
    await thu.getByRole('button', { name: 'Add to Thu 15 Oct' }).click()
    await page.getByRole('menuitem', { name: 'Task' }).click()
    const task = page.getByRole('dialog', { name: 'New task' })
    await expect(task.getByRole('button', { name: 'Do on' })).toHaveText(/Tomorrow/)
    await task.getByRole('textbox', { name: 'Title' }).fill('Collect the suit')
    await task.getByRole('button', { name: 'Save' }).click()
    await expect(cards(thu)).toHaveText([/Annual leave/, /Collect the suit/])

    const fri = day(page, 'Fri 16')
    await fri.hover()
    await fri.getByRole('button', { name: 'Add to Fri 16 Oct' }).click()
    await page.getByRole('menuitem', { name: 'Event' }).click()
    const event = page.getByRole('dialog', { name: 'New event' })
    await expect(event.getByRole('combobox', { name: 'Starts time' })).toContainText('09:00')
    await event.getByRole('textbox', { name: 'Title' }).fill('Haircut')
    await event.getByRole('button', { name: 'Save' }).click()
    await expect(cards(fri)).toHaveText([/Haircut.*09:00/, /Dinner with Sam/])
    await expect
      .poll(() => db.items.find((i) => i.title === 'Haircut')?.starts_at)
      .toBe('2026-10-16T08:00:00.000Z')
  })

  test('RMD-001 4, RMD-003 1: a day’s "+" adds a Reminder, on its day with its Alert’s time', async ({
    page,
  }) => {
    const db = await start(page)
    const thu = day(page, 'Thu 15')
    await thu.hover()
    await thu.getByRole('button', { name: 'Add to Thu 15 Oct' }).click()
    await page.getByRole('menuitem', { name: 'Reminder' }).click()
    const dialog = page.getByRole('dialog', { name: 'New reminder' })
    // Another day: my default time on it.
    await expect(dialog.getByRole('button', { name: /09:00/ })).toBeVisible()
    await expect(dialog.getByRole('button', { name: /Remove alert/ })).toHaveCount(0)
    await dialog.getByRole('textbox', { name: 'Title' }).fill('Parcel arriving')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(cards(thu)).toHaveText([/Annual leave/, /Reminder.*Parcel arriving.*09:00/])
    await expect
      .poll(() => db.items.find((i) => i.title === 'Parcel arriving')?.do_on)
      .toBe('2026-10-15')

    // Today: an hour from now.
    const wed = day(page, 'Wed 14')
    await wed.hover()
    await wed.getByRole('button', { name: 'Add to Today' }).click()
    await page.getByRole('menuitem', { name: 'Reminder' }).click()
    await page.getByRole('textbox', { name: 'Title' }).fill('Move the car')
    await page
      .getByRole('dialog', { name: 'New reminder' })
      .getByRole('button', { name: 'Save' })
      .click()
    await expect(cards(wed)).toHaveText([/Book Japan flights/, /Move the car.*11:00/])
  })

  test('PLN-007: dragging a Task or an Event to another day, with Undo', async ({ page }) => {
    const db = await start(page)
    await cards(day(page, 'Tue 13')).filter({ hasText: 'Call mum' }).dragTo(day(page, 'Thu 15'))
    await expect(cards(day(page, 'Thu 15'))).toHaveText([/Annual leave/, /Call mum.*18:00/])
    await expect
      .poll(() => db.items.find((i) => i.id === id(1)))
      .toMatchObject({ do_on: '2026-10-15', do_at: '18:00:00' })
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(cards(day(page, 'Tue 13'))).toHaveText([/Pay the plumber/, /Call mum/])

    await cards(day(page, 'Fri 16')).dragTo(day(page, 'Sat 17'))
    await expect
      .poll(() => db.items.find((i) => i.id === id(5)))
      .toMatchObject({ starts_at: '2026-10-17T18:30:00.000Z', ends_at: '2026-10-17T20:30:00.000Z' })
  })
})

test('WID-002 8: opened from the Today widget\'s "+", Plan\'s "+" is open on today', async ({
  page,
}) => {
  await start(page, '/plan?add=1')
  await expect(page.getByRole('menu')).toContainText('Add to Today')
  await page.getByRole('menuitem', { name: 'Task' }).click()
  const task = page.getByRole('dialog', { name: 'New task' })
  await expect(task.getByRole('button', { name: 'Do on' })).toHaveText(/Today/)
  // Not open again on coming back to the page.
  await expect(page).toHaveURL(/\/plan$/)
})

test('WID-002 8: with Plan already open, the widget\'s "+" still opens its list', async ({
  page,
}) => {
  await start(page)
  // The app sent to /plan?add=1 while on Plan, as a tap on the widget does.
  await page.evaluate(() => {
    window.history.pushState({}, '', '/plan?add=1')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect(page.getByRole('menu')).toContainText('Add to Today')
})

test('PLN-004: Types turned off stay off, on every device', async ({ page }) => {
  const db = await start(page, '/plan?day=2026-10-13')
  await expect(page.getByText('Call mum')).toBeVisible()
  await page.getByRole('button', { name: 'Tasks' }).click()
  await expect(page.getByText('Call mum')).toHaveCount(0)
  await expect.poll(() => db.people[0]!.plan_hidden_types).toEqual(['task'])
  await page.reload()
  await expect(page.getByRole('button', { name: 'Tasks' })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText('Call mum')).toHaveCount(0)
  await page.getByRole('button', { name: 'Tasks' }).click()
  await expect(page.getByText('Call mum')).toBeVisible()
})

test('PLN-005: a card opens its Item, and closing it leaves me on Plan', async ({ page }) => {
  await start(page, '/plan?day=2026-10-16')
  await page.getByRole('button', { name: 'Dinner with Sam' }).click()
  const popup = page.getByRole('dialog', { name: 'Dinner with Sam' })
  await expect(popup.getByRole('textbox', { name: 'Place' })).toHaveValue('Dishoom')
  await popup.getByRole('button', { name: 'Close' }).click()
  await expect(popup).toBeHidden()
  await expect(page).toHaveURL(/day=2026-10-16/)
})

test.describe('on a phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'A phone shows a day')

  test('PLN-002: today, with the week above it; another day chosen; the Fab adds to it', async ({
    page,
  }) => {
    const db = await start(page)
    await expect(page.getByRole('heading', { level: 2, name: /Wed 14 October/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Week', exact: true })).toBeHidden()
    await expect(cards(page.getByRole('main'))).toHaveText([/Book Japan flights/])
    await page.getByRole('tab', { name: /Tue/ }).click()
    await expect(cards(page.getByRole('main'))).toHaveText([/Pay the plumber/, /Call mum/])
    await page.getByRole('button', { name: 'Add' }).click()
    await page.getByRole('menuitem', { name: 'Task' }).click()
    const task = page.getByRole('dialog', { name: 'New task' })
    await task.getByRole('textbox', { name: 'Title' }).fill('Post the card')
    await task.getByRole('button', { name: 'Save' }).click()
    await expect
      .poll(() => db.items.find((i) => i.title === 'Post the card')?.do_on)
      .toBe('2026-10-13')
    await page.getByRole('button', { name: 'Next week' }).click()
    await expect(page.getByRole('heading', { level: 2, name: /Tue 20 October/ })).toBeVisible()
  })
})
