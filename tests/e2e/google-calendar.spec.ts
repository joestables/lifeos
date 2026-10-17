import { expect, test, type Page } from '@playwright/test'
import { itemRow, standIn, type Rows } from './stand-in'

// Friday 16 October 2026, 10:00 in London. Google itself is never called:
// the stand-in answers for the calendar-connect Edge Function.
const NOW = new Date('2026-10-16T10:00:00+01:00')
const DENTIST = '01990000-0000-7000-8000-000000000501'
const LUNCH = '01990000-0000-7000-8000-000000000502'

test.use({ timezoneId: 'Europe/London', locale: 'en-GB' })

const google: Rows['google'] = {
  account: 'ann@gmail.com',
  calendars: [
    { id: 'l-ann', calendar_id: 'ann@gmail.com', name: 'Ann' },
    { id: 'l-holidays', calendar_id: 'holidays', name: 'UK holidays', can_edit: false },
  ],
  events: [
    {
      id: DENTIST,
      title: 'Dentist',
      place: 'Smile Clinic',
      starts_at: '2026-10-16T13:30:00Z',
      ends_at: '2026-10-16T14:00:00Z',
      all_day: false,
    },
  ],
}

/** Already connected: Ann's calendar incoming, with an Event from it. */
const connected = (state = 'connected'): Rows => ({
  items: [
    itemRow({
      id: DENTIST,
      type: 'event',
      title: 'Dentist',
      place: 'Smile Clinic',
      body: 'Check-up',
      starts_at: '2026-10-16T13:30:00Z',
      ends_at: '2026-10-16T14:00:00Z',
      all_day: false,
    }),
    itemRow({
      id: LUNCH,
      type: 'event',
      title: 'Lunch with Sam',
      starts_at: '2026-10-16T11:00:00Z',
      ends_at: '2026-10-16T12:00:00Z',
      all_day: false,
    }),
  ],
  labels: [{ id: 'l-health', name: 'Health' }],
  connections: [
    {
      id: 'conn',
      account: 'ann@gmail.com',
      state,
      broken_since: state === 'broken' ? '2026-10-16T08:12:00Z' : null,
      last_synced_at: '2026-10-16T08:58:00Z',
      disconnected_at: null,
    },
  ],
  calendar_links: [
    {
      id: 'l-ann',
      calendar_id: 'ann@gmail.com',
      name: 'Ann',
      can_edit: true,
      is_primary: true,
      level: 'incoming',
      new_events: false,
    },
  ],
  external_refs: [{ item_id: DENTIST, calendar_link_id: 'l-ann', external_id: 'g-dentist' }],
})

async function start(page: Page, rows: Rows, path: string) {
  await page.clock.setFixedTime(NOW)
  const db = await standIn(page, { signedIn: true, rows })
  await page.goto(path)
  return db
}

test('GCL-001, GCL-003: connecting lists my calendars, the main one incoming, and its Events are on Plan', async ({
  page,
}) => {
  await start(page, { google }, '/settings')
  const card = page.locator('[data-slot="card"]').filter({ hasText: 'Google Calendar' })
  await expect(card).toContainText('Not connected')
  await card.getByRole('button', { name: 'Connect' }).click()
  await expect(page.getByText('Google Calendar connected')).toBeVisible()
  await expect(card).toContainText('ann@gmail.com')
  await expect(card.getByRole('combobox', { name: 'Ann: sync' })).toContainText('Incoming')
  await expect(card.getByRole('combobox', { name: 'UK holidays: sync' })).toContainText('Off')
  await expect(card).toContainText('Can’t edit')

  await page.goto('/plan')
  await expect(
    page.locator('[data-slot="plan-card"]').filter({ hasText: 'Dentist' }),
  ).toContainText(/14:30.* · Smile Clinic/)
})

test('GCL-004: an Event from an incoming calendar is Google’s; its Labels and Reminders are mine', async ({
  page,
}) => {
  const db = await start(page, connected(), `/plan?item=${DENTIST}`)
  const popup = page.getByRole('dialog', { name: 'Dentist' })
  await expect(popup).toContainText('Google Calendar · Ann · Incoming')
  await expect(popup).toContainText('Smile Clinic')
  await expect(popup.getByRole('textbox', { name: 'Title' })).toHaveCount(0)
  await expect(popup.getByRole('textbox', { name: 'Place' })).toHaveCount(0)
  await expect(popup.locator('a', { hasText: 'Open in Google Calendar' })).toHaveAttribute(
    'href',
    /^https:\/\/calendar\.google\.com\/calendar\/event\?eid=/,
  )
  await popup.getByRole('button', { name: 'More' }).first().click()
  await expect(page.getByRole('menu').getByRole('menuitem')).toHaveText(['Open in Google Calendar'])
  await page.keyboard.press('Escape')

  await popup.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Health' }).click()
  await expect.poll(() => db.item_labels).toEqual([{ item_id: DENTIST, label_id: 'l-health' }])
})

test('PLN-007 4: an Event from an incoming calendar can’t be dragged', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Dragging is a computer’s')
  const db = await start(page, connected(), '/plan')
  const day = (name: string) => page.getByRole('group', { name, exact: true })
  await day('Fri 16')
    .locator('[data-slot="plan-card"]')
    .filter({ hasText: 'Dentist' })
    .dragTo(day('Sat 17'))
  await day('Fri 16')
    .locator('[data-slot="plan-card"]')
    .filter({ hasText: 'Lunch' })
    .dragTo(day('Sat 17'))
  await expect(day('Sat 17').locator('[data-slot="plan-card"]')).toHaveText([/Lunch with Sam/])
  expect(db.items.find((i) => i.id === DENTIST)?.starts_at).toBe('2026-10-16T13:30:00Z')
})

test('GCL-002 3: a calendar turned off takes its Events off Plan', async ({ page }) => {
  const db = await start(page, connected(), '/settings')
  await page.getByRole('combobox', { name: 'Ann: sync' }).click()
  await page.getByRole('option', { name: 'Off' }).click()
  await expect.poll(() => db.calendar_links[0]!.level).toBe('off')
  await page.goto('/plan')
  await expect(page.getByText('Lunch with Sam')).toBeVisible()
  await expect(page.getByText('Dentist')).toHaveCount(0)
})

test('GCL-002 1, 2: two-way where I can edit it; the first two-way calendar is my default, which can be None', async ({
  page,
}) => {
  const rows = connected()
  rows.calendar_links!.push(
    {
      id: 'l-work',
      calendar_id: 'work',
      name: 'Work',
      can_edit: true,
      is_primary: false,
      level: 'off',
      new_events: false,
    },
    {
      id: 'l-holidays',
      calendar_id: 'holidays',
      name: 'UK holidays',
      can_edit: false,
      is_primary: false,
      level: 'incoming',
      new_events: false,
    },
  )
  const db = await start(page, rows, '/settings')
  const card = page.locator('[data-slot="card"]').filter({ hasText: 'Google Calendar' })
  await card.getByRole('combobox', { name: 'UK holidays: sync' }).click()
  await expect(page.getByRole('option')).toHaveText(['Off', 'Incoming'])
  await page.keyboard.press('Escape')
  await expect(card.getByRole('combobox', { name: 'Default calendar' })).toHaveCount(0)

  /** Picks an option, then waits for the list to close before the next. */
  const choose = async (select: string, option: string) => {
    await card.getByRole('combobox', { name: select }).click()
    await page.getByRole('option', { name: option }).click()
    await expect(page.getByRole('listbox')).toHaveCount(0)
  }
  await choose('Ann: sync', 'Two-way')
  await expect(card.getByRole('combobox', { name: 'Default calendar' })).toContainText('Ann')
  await choose('Work: sync', 'Two-way')
  await card.getByRole('combobox', { name: 'Default calendar' }).click()
  await expect(page.getByRole('option')).toHaveText(['None', 'Ann', 'Work'])
  await page.keyboard.press('Escape')
  await expect(page.getByRole('listbox')).toHaveCount(0)
  await choose('Default calendar', 'Work')
  await expect
    .poll(() => db.calendar_links.map((l) => [l.id, l.level, l.new_events]))
    .toEqual([
      ['l-ann', 'two_way', false],
      ['l-work', 'two_way', true],
      ['l-holidays', 'incoming', false],
    ])

  // None: new Events stay in LifeOS unless I choose a calendar for one.
  await choose('Default calendar', 'None')
  await expect.poll(() => db.calendar_links.some((l) => l.new_events)).toBe(false)
  await expect(card.getByRole('combobox', { name: 'Default calendar' })).toContainText('None')
})

test('GCL-005 1: a new Event goes to the calendar chosen for it, my default unless I change it', async ({
  page,
}) => {
  const rows = connected()
  rows.calendar_links![0]!.level = 'two_way'
  rows.calendar_links![0]!.new_events = true
  rows.calendar_links!.push({
    id: 'l-work',
    calendar_id: 'work',
    name: 'Work',
    can_edit: true,
    is_primary: false,
    level: 'two_way',
    new_events: false,
  })
  const db = await start(page, rows, '/plan')
  const make = async (title: string, calendar?: string) => {
    await page.getByRole('button', { name: 'Add', exact: true }).filter({ visible: true }).click()
    await page.getByRole('menuitem', { name: 'Event' }).click()
    const dialog = page.getByRole('dialog', { name: 'New event' })
    await dialog.getByRole('textbox', { name: 'Title' }).fill(title)
    const field = dialog.getByRole('combobox', { name: 'Calendar' })
    await expect(field).toContainText('Ann')
    if (calendar) {
      await field.click()
      await expect(page.getByRole('option')).toHaveText(['None', 'Ann', 'Work'])
      await page.getByRole('option', { name: calendar }).click()
      await expect(page.getByRole('listbox')).toHaveCount(0)
    }
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(dialog).toBeHidden()
  }
  await make('Standup', 'Work')
  await make('Think', 'None')
  await make('Gym')
  // The choice is written before the Event, so it never goes out without it.
  const title = (id: string) => db.items.find((i) => i.id === id)?.title
  await expect
    .poll(() => db.event_calendars.map((c) => [title(c.item_id), c.calendar_link_id]))
    .toEqual([
      ['Standup', 'l-work'],
      ['Think', null],
      ['Gym', 'l-ann'],
    ])
})

test('GCL-005 2: an Event from a two-way calendar is mine to change and drag', async ({
  page,
  isMobile,
}) => {
  const rows = connected()
  rows.calendar_links![0]!.level = 'two_way'
  const db = await start(page, rows, `/plan?item=${DENTIST}`)
  const popup = page.getByRole('dialog', { name: 'Dentist' })
  await expect(popup).toContainText('Google Calendar · Ann · Two-way')
  const title = popup.getByRole('textbox', { name: 'Title' })
  await title.fill('Dentist, check-up')
  await title.press('Enter')
  await expect.poll(() => db.items.find((i) => i.id === DENTIST)?.title).toBe('Dentist, check-up')
  if (isMobile) return
  await page.keyboard.press('Escape')
  const day = (name: string) => page.getByRole('group', { name, exact: true })
  await day('Fri 16')
    .locator('[data-slot="plan-card"]')
    .filter({ hasText: 'Dentist' })
    .dragTo(day('Sat 17'))
  await expect.poll(() => db.items.find((i) => i.id === DENTIST)?.starts_at).toMatch(/^2026-10-17/)
})

test('GCL-006 1: a broken connection shows in Inbox, with Reconnect', async ({ page }) => {
  await start(page, connected('broken'), '/inbox')
  const alert = page.getByRole('status').filter({ hasText: 'Google Calendar isn’t syncing' })
  await expect(alert).toContainText('Since today 09:12')
  await expect(alert.getByRole('button', { name: 'Reconnect' })).toBeVisible()
})

test('GCL-001 3: disconnecting takes Google’s Events off Plan; my own stay', async ({ page }) => {
  const rows = connected()
  // Lunch was made in LifeOS and sent to Google.
  rows.external_refs!.push({
    item_id: LUNCH,
    calendar_link_id: 'l-ann',
    external_id: 'g-lunch',
    made_in_lifeos: true,
  })
  const db = await start(page, rows, '/settings')
  await page.getByRole('button', { name: 'Google Calendar options' }).click()
  await page.getByRole('menuitem', { name: 'Disconnect' }).click()
  await expect(page.getByText('Google Calendar disconnected')).toBeVisible()
  await expect(
    page.locator('[data-slot="card"]').filter({ hasText: 'Google Calendar' }),
  ).toContainText('Not connected')
  expect(db.items.find((i) => i.id === DENTIST)?.archived_at).toBeTruthy()
  expect(db.items.find((i) => i.id === LUNCH)?.archived_at).toBeNull()
})
