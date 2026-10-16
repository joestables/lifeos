import { expect, test, type Page } from '@playwright/test'
import { itemRow, standIn } from './stand-in'

// Friday 16 October 2026, 10:20 in London (BST, an hour ahead of UTC).
const NOW = new Date('2026-10-16T10:20:00+01:00')
const id = (n: number) => `01990000-0000-7000-8000-0000000003${String(n).padStart(2, '0')}`
const LUNCH = id(1)
const DINNER = id(2)
const CARD = id(3)
const FLOWERS = id(4)
const THOUGHT = id(5)

test.use({ timezoneId: 'Europe/London', locale: 'en-GB' })

const rows = () => ({
  items: [
    itemRow({
      id: LUNCH,
      type: 'event',
      title: "Mum's birthday lunch",
      place: 'The Ivy, Richmond',
      starts_at: '2026-10-17T12:00:00Z',
      ends_at: '2026-10-17T14:00:00Z',
      all_day: false,
    }),
    itemRow({
      id: DINNER,
      type: 'task',
      title: 'Dinner with Sam',
      do_on: '2026-10-16',
      do_at: '19:00:00',
    }),
    itemRow({ id: CARD, type: 'task', title: 'Buy a card for mum', do_on: '2026-10-17' }),
    itemRow({ id: FLOWERS, type: 'task', title: 'Order flowers' }),
    itemRow({
      id: THOUGHT,
      type: 'thought',
      title: 'drinks with Alex sat 6pm',
      created_at: '2026-10-16T08:00:00Z',
    }),
  ],
  labels: [{ id: 'l-family', name: 'Family' }],
  links: [{ from_item: CARD, to_item: LUNCH, link_type: 'for' }],
})

async function start(page: Page, path: string) {
  await page.clock.setFixedTime(NOW)
  const db = await standIn(page, { signedIn: true, rows: rows() })
  await page.goto(path)
  return db
}

test('EVT-001: a new Event from Plan, an hour long until I change it, kept only on Save', async ({
  page,
}) => {
  const db = await start(page, '/plan')
  const newEvent = page.getByRole('button', { name: 'New event' }).last()
  await newEvent.click()
  let dialog = page.getByRole('dialog', { name: 'New event' })
  await expect(dialog.getByRole('textbox', { name: 'Starts time' })).toHaveValue('11:00')
  await expect(dialog.getByRole('textbox', { name: 'Ends time' })).toHaveValue('12:00')
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toBeHidden()
  expect(db.items.filter((i) => i.type === 'event')).toHaveLength(1)

  await newEvent.click()
  dialog = page.getByRole('dialog', { name: 'New event' })
  await dialog.getByRole('textbox', { name: 'Title' }).fill('5-a-side')
  await dialog.getByRole('textbox', { name: 'Starts time' }).fill('19:30')
  await expect(dialog.getByRole('textbox', { name: 'Ends time' })).toHaveValue('20:30')

  // An end before the start is refused.
  await dialog.getByRole('textbox', { name: 'Ends time' }).fill('18:00')
  await expect(dialog.getByRole('alert')).toHaveText('It ends before it starts')
  await expect(dialog.getByRole('button', { name: 'Save' })).toBeDisabled()
  await dialog.getByRole('textbox', { name: 'Ends time' }).fill('21:00')

  await dialog.getByRole('textbox', { name: 'Place' }).fill('Powerleague')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Event saved')).toBeVisible()
  await expect
    .poll(() => db.items.find((i) => i.title === '5-a-side'))
    .toMatchObject({
      type: 'event',
      place: 'Powerleague',
      starts_at: '2026-10-16T18:30:00.000Z',
      ends_at: '2026-10-16T20:00:00.000Z',
      all_day: false,
    })
})

test('EVT-001 3, EVT-002: an Event changed in its popup; all day kept as dates; deleted with Undo', async ({
  page,
}) => {
  const db = await start(page, `/plan?item=${LUNCH}`)
  const popup = page.getByRole('dialog', { name: "Mum's birthday lunch" })
  await expect(popup.getByRole('textbox', { name: 'Starts time' })).toHaveValue('13:00')
  await expect(popup.getByRole('textbox', { name: 'Ends time' })).toHaveValue('15:00')
  await expect(popup.getByRole('textbox', { name: 'Place' })).toHaveValue('The Ivy, Richmond')

  await popup.getByRole('textbox', { name: 'Place' }).fill('The Ivy, Kew')
  await popup.getByRole('textbox', { name: 'Notes' }).fill('Table for six')
  await popup.getByRole('textbox', { name: 'Notes' }).blur()
  await expect
    .poll(() => db.items.find((i) => i.id === LUNCH))
    .toMatchObject({ place: 'The Ivy, Kew', body: 'Table for six' })

  await popup.getByRole('textbox', { name: 'Starts time' }).fill('12:30')
  await expect
    .poll(() => db.items.find((i) => i.id === LUNCH))
    .toMatchObject({ starts_at: '2026-10-17T11:30:00.000Z', ends_at: '2026-10-17T13:30:00.000Z' })

  await popup.getByRole('switch').click()
  await expect(popup.getByRole('textbox', { name: 'Starts time' })).toBeHidden()
  await expect
    .poll(() => db.items.find((i) => i.id === LUNCH))
    .toMatchObject({
      all_day: true,
      starts_at: '2026-10-17T00:00:00.000Z',
      ends_at: '2026-10-18T00:00:00.000Z',
    })

  await popup.getByRole('button', { name: 'More' }).first().click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await expect(page.getByText('Deleted "Mum\'s birthday lunch"')).toBeVisible()
  await expect.poll(() => db.items.find((i) => i.id === LUNCH)?.archived_at).toBeTruthy()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect.poll(() => db.items.find((i) => i.id === LUNCH)?.archived_at).toBeNull()
})

test('EVT-003 3: an Event reminds me before it starts, or on a day before it at a time', async ({
  page,
}) => {
  const db = await start(page, `/plan?item=${LUNCH}`)
  const popup = page.getByRole('dialog', { name: "Mum's birthday lunch" })
  await popup.getByRole('button', { name: 'Add a reminder' }).click()
  let reminder = page.getByRole('dialog', { name: 'Reminder' })
  await expect(reminder.getByRole('combobox', { name: 'On', exact: true })).toContainText(
    'Before it starts',
  )
  await reminder.getByRole('combobox', { name: 'How long before' }).click()
  await page.getByRole('option', { name: '1 hour before' }).click()
  await reminder.getByRole('button', { name: 'Save' }).click()
  await expect
    .poll(() => db.reminders.find((r) => r.item_id === LUNCH))
    .toMatchObject({ anchor: 'starts_at', offset_minutes: -60, at_time: null })

  await popup.getByRole('button', { name: 'Add a reminder' }).click()
  reminder = page.getByRole('dialog', { name: 'Reminder' })
  await reminder.getByRole('combobox', { name: 'On', exact: true }).click()
  await page.getByRole('option', { name: 'The day it starts' }).click()
  await reminder.getByRole('spinbutton', { name: 'Days before' }).fill('1')
  await reminder.getByRole('textbox', { name: 'Time' }).fill('18:00')
  await reminder.getByRole('button', { name: 'Save' }).click()
  await expect
    .poll(() => db.reminders.filter((r) => r.item_id === LUNCH).map((r) => r.offset_days))
    .toEqual([0, -1])
  await expect(popup.getByText('1 day before')).toBeVisible()
})

test('EVT-005: a Task becomes an Event at its time, an hour long, and back with Undo', async ({
  page,
}) => {
  const db = await start(page, `/tasks?item=${DINNER}`)
  const popup = page.getByRole('dialog', { name: 'Dinner with Sam' })
  await popup.getByRole('button', { name: 'More' }).first().click()
  await page.getByRole('menuitem', { name: 'Event' }).click()
  await expect(page.getByText('Converted into an Event')).toBeVisible()
  await expect(popup.getByRole('textbox', { name: 'Starts time' })).toHaveValue('19:00')
  await expect(popup.getByRole('textbox', { name: 'Ends time' })).toHaveValue('20:00')
  await expect
    .poll(() => db.items.find((i) => i.id === DINNER))
    .toMatchObject({
      type: 'event',
      starts_at: '2026-10-16T18:00:00.000Z',
      ends_at: '2026-10-16T19:00:00.000Z',
      all_day: false,
    })

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect.poll(() => db.items.find((i) => i.id === DINNER)?.type).toBe('task')
  await expect(popup.getByRole('checkbox', { name: 'Done' })).toBeVisible()
})

test('EVT-006: Tasks for an Event, linked or made there, unlinked; the Task shows what it is for', async ({
  page,
}) => {
  const db = await start(page, `/plan?item=${LUNCH}`)
  const popup = page.getByRole('dialog', { name: "Mum's birthday lunch" })
  const tasks = popup.locator('[data-slot="item-row"]')
  await expect(tasks).toHaveText([/Buy a card for mum/])

  await popup.getByRole('button', { name: 'Link a task' }).click()
  const find = page.getByRole('textbox', { name: 'Find or make a task' })
  await find.fill('flow')
  await page.getByRole('button', { name: 'Order flowers' }).click()
  await expect(find).toBeHidden()
  await expect(tasks).toHaveCount(2)

  await popup.getByRole('button', { name: 'Link a task' }).click()
  await find.fill('Book the table')
  await page.getByRole('button', { name: 'New task "Book the table"' }).click()
  await expect(tasks).toHaveCount(3)
  await expect
    .poll(() => db.links.filter((l) => l.to_item === LUNCH && l.link_type === 'for').length)
    .toBe(3)
  expect(db.items.find((i) => i.title === 'Book the table')?.type).toBe('task')

  await tasks.filter({ hasText: 'Order flowers' }).getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Remove link' }).click()
  await expect(tasks).toHaveCount(2)
  await expect.poll(() => db.links.some((l) => l.from_item === FLOWERS)).toBe(false)
  expect(db.items.find((i) => i.id === FLOWERS)?.archived_at).toBeNull()

  // The Task says what it is for, and opens it.
  await tasks.filter({ hasText: 'Buy a card for mum' }).getByText('Buy a card for mum').click()
  const task = page.getByRole('dialog', { name: 'Buy a card for mum' })
  await expect(task.getByText('For', { exact: true })).toBeVisible()
  await task.getByText("Mum's birthday lunch").click()
  await expect(page.getByRole('dialog', { name: "Mum's birthday lunch" })).toBeVisible()
})

test('INB-002 3: a Thought sorted into an Event, its date and time its start', async ({ page }) => {
  const db = await start(page, `/inbox?item=${THOUGHT}`)
  const popup = page.getByRole('dialog', { name: 'drinks with Alex sat 6pm' })
  await popup.getByRole('button', { name: 'More' }).first().click()
  await page.getByRole('menuitem', { name: 'Event' }).click()
  await expect
    .poll(() => db.items.find((i) => i.id === THOUGHT))
    .toMatchObject({
      type: 'event',
      title: 'Drinks with Alex',
      starts_at: '2026-10-17T17:00:00.000Z',
      ends_at: '2026-10-17T18:00:00.000Z',
    })
})

test('REM-007 2: the Event default is turned off in Settings', async ({ page }) => {
  const db = await start(page, '/settings')
  const events = page.getByRole('switch', { name: 'Remind me 30 minutes before events' })
  await expect(events).toBeChecked()
  await events.click()
  await expect.poll(() => db.people[0]!.reminder_defaults).toEqual({ event: false })
})
