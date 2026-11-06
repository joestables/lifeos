import { expect, test, type Page } from '@playwright/test'
import { itemRow, pickTime, pushAllowed, type Rows, standIn } from './stand-in'

// Monday 12 October 2026, 09:00 in London.
const NOW = new Date('2026-10-12T09:00:00+01:00')
const id = (n: number) => `01990000-0000-7000-8000-0000000004${String(n).padStart(2, '0')}`

test.use({ timezoneId: 'Europe/London' })

const rows = (extra: Rows = {}): Rows => ({
  items: [
    itemRow({ id: id(1), type: 'task', title: 'Renew insurance', do_on: '2026-10-16' }),
    itemRow({ id: id(2), type: 'thought', title: 'Gift idea for Sam' }),
  ],
  reminders: [
    {
      id: 'r-default',
      item_id: id(1),
      anchor: 'do_on',
      is_default: true,
      fires_at: '2026-10-16T08:00:00Z',
    },
  ],
  ...extra,
})

async function start(page: Page, path: string, extra: Rows = {}) {
  await page.clock.setFixedTime(NOW)
  await pushAllowed(page)
  const db = await standIn(page, { signedIn: true, rows: rows(extra) })
  await page.goto(path)
  return db
}

const card = (page: Page, title: string) =>
  page.locator('[data-slot="card"]').filter({ has: page.getByRole('heading', { name: title }) })

test('REM-001: notifications turned on for this device, off, and the device removed', async ({
  page,
}) => {
  const db = await start(page, '/settings', {
    push_devices: [
      { id: 'd-laptop', endpoint: 'https://push.example/laptop', label: 'Mac · Safari' },
    ],
  })
  const notifications = card(page, 'Notifications')
  await notifications.getByRole('button', { name: 'Turn on' }).click()
  await expect(
    notifications.locator('[data-slot="card-row"], div').filter({ hasText: 'This device' }).first(),
  ).toBeVisible()
  await expect
    .poll(() => db.push_devices.find((d) => d.endpoint === 'https://push.example/this-device'))
    .toMatchObject({ enabled: true })
  await expect(notifications.getByRole('button', { name: 'Turn on' })).toBeHidden()

  await notifications.getByRole('switch', { name: 'Notifications on Mac · Safari' }).click()
  await expect.poll(() => db.push_devices.find((d) => d.id === 'd-laptop')?.enabled).toBe(false)

  await notifications.getByRole('button', { name: 'Mac · Safari options' }).click()
  await page.getByRole('menuitem', { name: 'Remove' }).click()
  await expect(notifications).not.toContainText('Mac · Safari')
  await expect.poll(() => db.push_devices.some((d) => d.id === 'd-laptop')).toBe(false)
})

test('REM-001 1: Inbox offers to turn notifications on while no device has them', async ({
  page,
}) => {
  const db = await start(page, '/inbox')
  const offer = page.getByRole('status').filter({ hasText: 'Notifications are off' })
  await expect(offer).toBeVisible()
  await offer.getByRole('button', { name: 'Turn on' }).click()
  await expect(offer).toBeHidden()
  await expect.poll(() => db.push_devices.length).toBe(1)
})

test('REM-001 1: "Not now" puts the offer away', async ({ page }) => {
  await start(page, '/inbox')
  const offer = page.getByRole('status').filter({ hasText: 'Notifications are off' })
  await offer.getByRole('button', { name: 'Not now' }).click()
  await expect(offer).toBeHidden()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Inbox', level: 1 })).toBeVisible()
  await expect(offer).toBeHidden()
})

test.describe('on an iPhone, in the browser', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  })

  test('REM-001 3: I am told to add LifeOS to the Home Screen first', async ({ page }) => {
    await start(page, '/settings')
    await expect(card(page, 'Notifications')).toContainText('Add LifeOS to your Home Screen first')
    await expect(card(page, 'Notifications').getByRole('button', { name: 'Turn on' })).toBeHidden()
  })
})

test('REM-007, REM-008: my default time, the defaults by Type and the morning digest', async ({
  page,
}) => {
  const db = await start(page, '/settings')
  const reminders = card(page, 'Reminders')
  await pickTime(reminders.getByLabel('Default time'), '08:00')
  await expect.poll(() => db.people[0]!.default_reminder_time).toBe('08:00')
  await reminders.getByRole('switch', { name: 'Remind me of dated tasks' }).click()
  await expect.poll(() => db.people[0]!.reminder_defaults).toEqual({ task: false })
  await pickTime(reminders.getByLabel('Digest time'), '06:30')
  await expect.poll(() => db.people[0]!.digest_time).toBe('06:30')
  await reminders.getByRole('switch', { name: 'Morning digest' }).click()
  await expect.poll(() => db.people[0]!.digest_on).toBe(false)
  await expect(reminders.getByLabel('Digest time')).toBeHidden()
})

test("REM-002, REM-003: a Task's Reminders, its default and my own, changed and removed", async ({
  page,
}) => {
  const db = await start(page, `/tasks?item=${id(1)}`)
  const task = page.getByRole('dialog', { name: 'Renew insurance' })
  await expect(task).toContainText('Fri 09:00')
  await expect(task).toContainText('On the day')

  // "1 day before at 18:00".
  await task.getByRole('button', { name: 'Add a reminder' }).click()
  const dialog = page.getByRole('dialog', { name: 'Reminder' })
  await dialog.getByLabel('Days before').fill('1')
  await pickTime(dialog.getByLabel('Time'), '18:00')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect
    .poll(() => db.reminders.find((r) => r.id !== 'r-default'))
    .toMatchObject({ anchor: 'do_on', offset_days: -1, at_time: '18:00', fixed_at: null })

  // The default, moved to 08:00, becomes mine.
  await task.getByRole('button', { name: /^Fri 09:00/ }).click()
  await pickTime(dialog.getByLabel('Time'), '08:00')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect
    .poll(() => db.reminders.find((r) => r.id === 'r-default'))
    .toMatchObject({ at_time: '08:00', is_default: false })

  await task.getByRole('button', { name: /^Remove reminder Fri/ }).click()
  await expect.poll(() => db.reminders.some((r) => r.id === 'r-default')).toBe(false)
})

test('REM-011 1: a Reminder made an Alarm, off to start, on any device', async ({ page }) => {
  const db = await start(page, `/tasks?item=${id(1)}`)
  const task = page.getByRole('dialog', { name: 'Renew insurance' })
  await task.getByRole('button', { name: /^Fri 09:00/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Reminder' })
  const alarm = dialog.getByRole('switch', { name: 'Alarm' })
  await expect(alarm).not.toBeChecked()
  await alarm.click()
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect
    .poll(() => db.reminders.find((r) => r.id === 'r-default'))
    .toMatchObject({ alarm: true, is_default: false })
  await expect(task.locator('svg.lucide-alarm-clock')).toBeVisible()

  await task.getByRole('button', { name: /^Fri 09:00/ }).click()
  await expect(dialog.getByRole('switch', { name: 'Alarm' })).toBeChecked()
})

test('REM-003: a Thought gets a Reminder at a set time', async ({ page }) => {
  const db = await start(page, `/inbox?item=${id(2)}`)
  const thought = page.getByRole('dialog', { name: 'Gift idea for Sam' })
  await thought.getByRole('button', { name: 'Add a reminder' }).click()
  const dialog = page.getByRole('dialog', { name: 'Reminder' })
  await pickTime(dialog.getByLabel('Time'), '19:00')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect
    .poll(() => db.reminders.find((r) => r.item_id === id(2)))
    .toMatchObject({ anchor: null, fixed_at: '2026-10-12T18:00:00.000Z' })
  await expect(thought).toContainText('Today 19:00')
})

test('REM-007 2: with the Thought default off, a dated Thought gets no Reminder', async ({
  page,
}) => {
  const db = await start(page, '/inbox', { people: [{ reminder_defaults: { thought: false } }] })
  await expect(page.getByRole('heading', { name: 'Inbox', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'New', exact: true }).first().click()
  const capture = page.getByRole('dialog', { name: 'Capture' })
  await capture.getByRole('textbox').fill('book the dentist fri')
  await capture.getByRole('textbox').press('Enter')
  await expect.poll(() => db.items.some((i) => i.title === 'book the dentist fri')).toBe(true)
  expect(db.reminders.filter((r) => r.item_id !== id(1))).toEqual([])
})

test("REM-006: a tapped notification opens its Item in the window that's open", async ({
  page,
}) => {
  await start(page, '/inbox')
  await expect(page.getByRole('heading', { name: 'Inbox', level: 1 })).toBeVisible()
  // What the service worker says when its notification is tapped.
  await page.evaluate(
    (url) =>
      navigator.serviceWorker.dispatchEvent(
        new MessageEvent('message', { data: { type: 'navigate', url } }),
      ),
    `/item/${id(1)}`,
  )
  await expect(page.getByRole('dialog', { name: 'Renew insurance' })).toBeVisible()
})

test('ACC-003 3: signing out stops notifications on this device', async ({ page }) => {
  await page.clock.setFixedTime(NOW)
  await pushAllowed(page, 'https://push.example/this-device', { subscribed: true })
  const db = await standIn(page, {
    signedIn: true,
    rows: rows({
      push_devices: [
        { id: 'd-this', endpoint: 'https://push.example/this-device', label: 'Android · Chrome' },
      ],
    }),
  })
  await page.goto('/settings')
  await expect(card(page, 'Notifications')).toContainText('This device')
  await page.evaluate(() => sessionStorage.setItem('stand-in-signed-out', '1'))
  await page.getByRole('button', { name: 'Sign out' }).first().click()
  await expect(page).toHaveURL(/\/sign-in$/)
  expect(db.push_devices.some((d) => d.id === 'd-this')).toBe(false)
})
