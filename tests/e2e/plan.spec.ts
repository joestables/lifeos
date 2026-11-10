import { expect, test, type Page } from '@playwright/test'
import { itemRow, pickTime, standIn } from './stand-in'

// Monday 12 October 2026, 09:00 in London: tomorrow is Tuesday, and
// Wednesday to Sunday have their own groups.
const NOW = new Date('2026-10-12T09:00:00+01:00')
const id = (n: number) => `01990000-0000-7000-8000-0000000002${String(n).padStart(2, '0')}`

test.use({ timezoneId: 'Europe/London' })

const rows = () => ({
  items: [
    itemRow({ id: id(1), type: 'task', title: 'Renew car insurance', due_on: '2026-10-08' }),
    itemRow({ id: id(2), type: 'task', title: 'Call mum', do_on: '2026-10-12', do_at: '18:00:00' }),
    itemRow({ id: id(3), type: 'task', title: 'Take the bins out', do_on: '2026-10-13' }),
    itemRow({ id: id(4), type: 'task', title: 'Order a present', do_on: '2026-10-16' }),
    itemRow({ id: id(5), type: 'task', title: 'Book MOT', due_on: '2026-10-30' }),
    itemRow({ id: id(6), type: 'task', title: 'Fix the gate' }),
    itemRow({ id: id(7), type: 'task', title: 'Learn Japanese', status: 'idea' }),
    itemRow({
      id: id(8),
      type: 'task',
      title: 'Return the jacket',
      status: 'done',
      updated_at: '2026-10-11T10:00:00Z',
    }),
  ],
  marks: [{ item_id: id(2) }],
})

async function start(page: Page, path = '/plan') {
  await page.clock.setFixedTime(NOW)
  const db = await standIn(page, { signedIn: true, rows: rows(), clock: NOW })
  await page.goto(path)
  await expect(page.getByRole('heading', { name: 'Plan', level: 1 })).toBeVisible()
  return db
}

const rowOf = (page: Page, title: string) =>
  page.locator('[data-slot="item-row"]').filter({ hasText: title })
const headings = (page: Page) => page.getByRole('main').getByRole('heading', { level: 2 })

test('PLA-002, TSK-007: Tasks by when, Someday last', async ({ page }) => {
  await start(page)
  await expect(headings(page)).toHaveText([
    'Overdue1',
    'Today1',
    'Tomorrow1',
    'Friday1',
    'Later1',
    'No date1',
    'Someday1',
  ])
  await expect(rowOf(page, 'Renew car insurance')).toHaveText(/Due Thu 8 Oct$/)
  await expect(rowOf(page, 'Book MOT')).toContainText('Due Fri 30 Oct')
  await expect(rowOf(page, 'Call mum').getByRole('button', { name: 'Star' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByText('Return the jacket')).toBeHidden()
})

test('PLA-001: Tasks, Events, Reminders and Recurring; no Completed tab or Labels; the action follows the tab', async ({
  page,
  isMobile,
}) => {
  await start(page)
  await expect(page.getByRole('tablist', { name: 'View' }).getByRole('tab')).toHaveText([
    'Tasks',
    'Events',
    'Reminders',
    'Recurring',
  ])
  await expect(page.getByRole('group', { name: 'Filter by label' })).toHaveCount(0)
  for (const [tab, action] of [
    ['Events', 'New event'],
    ['Reminders', 'New reminder'],
    ['Tasks', 'New task'],
  ]) {
    await page.getByRole('tab', { name: tab }).click()
    await expect(page.getByRole('button', { name: action }).first()).toBeVisible()
  }
  await page.getByRole('tab', { name: 'Recurring' }).click()
  await expect(page).toHaveURL(/\/plan\?tab=recurring$/)
  await page.getByRole('button', { name: 'New', exact: true }).last().click()
  await expect(page.getByRole('menu').getByRole('menuitem')).toHaveText([
    'Task',
    'Event',
    'Reminder',
  ])
  if (!isMobile) await page.keyboard.press('Escape')
})

test('PLA-001 1: /tasks opens Plan, Recurring kept', async ({ page }) => {
  await start(page, '/tasks?view=recurring')
  await expect(page).toHaveURL(/\/plan\?tab=recurring$/)
})

test('TSK-001, PLA-007: "New task" opens a new Task with all its fields, no Labels or sub-tasks, kept on Save', async ({
  page,
}) => {
  const db = await start(page)
  await page.getByRole('button', { name: 'New task' }).click()
  const dialog = page.getByRole('dialog', { name: 'New task' })
  await expect(dialog.getByRole('textbox', { name: 'Title' })).toBeFocused()
  await expect(dialog.getByRole('button', { name: 'Save' })).toBeDisabled()
  // PLA-006: on today; its default Alert (09:00) gone by, an hour from now.
  await expect(dialog.getByRole('button', { name: 'Do on' })).toContainText('Today')
  await expect(dialog.getByRole('button', { name: /^Today 10:00/ })).toBeVisible()
  await dialog.getByRole('textbox', { name: 'Title' }).fill('Renew insurance')
  await dialog.getByRole('textbox', { name: 'Notes' }).fill('Policy 123')
  await expect(dialog.getByText('Labels', { exact: true })).toHaveCount(0)
  await expect(dialog.getByText('Sub-tasks', { exact: true })).toHaveCount(0)
  // Nothing is kept yet.
  expect(db.items.some((i) => i.title === 'Renew insurance')).toBe(false)

  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Task saved')).toBeVisible()
  await expect(rowOf(page, 'Renew insurance')).toBeVisible()
  await expect
    .poll(() => {
      const t = db.items.find((i) => i.title === 'Renew insurance')
      return (
        t && [
          t.body,
          t.do_on,
          db.alerts.filter((r) => r.item_id === t.id).map((r) => [r.is_default, r.fixed_at]),
        ]
      )
    })
    .toEqual(['Policy 123', '2026-10-12', [[false, '2026-10-12T09:00:00.000Z']]])
})

test('TSK-001: a new Task cancelled leaves nothing behind, and a click outside keeps it open once typed in', async ({
  page,
}) => {
  const db = await start(page)
  await page.getByRole('button', { name: 'New task' }).click()
  const dialog = page.getByRole('dialog', { name: 'New task' })
  await dialog.getByRole('textbox', { name: 'Title' }).fill('Paint the shed')
  await page.mouse.click(5, 5)
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toBeHidden()
  expect(db.items.some((i) => i.title === 'Paint the shed')).toBe(false)
})

test('REM-002 1: New task shows its default Alert; left, changed or removed, that is what it gets', async ({
  page,
}) => {
  const db = await start(page)
  const newTask = async (title: string) => {
    await page.getByRole('button', { name: 'New task' }).click()
    const dialog = page.getByRole('dialog', { name: 'New task' })
    await dialog.getByRole('textbox', { name: 'Title' }).fill(title)
    // It starts on today (PLA-006 1); tomorrow instead.
    await dialog.getByRole('button', { name: 'Do on' }).click()
    await page.getByRole('button', { name: /13th/ }).click()
    await pickTime(dialog.getByLabel('Time'), '20:00')
    return dialog
  }
  const alertsOf = (title: string) => {
    const t = db.items.find((i) => i.title === title)
    return t && db.alerts.filter((r) => r.item_id === t.id).map((r) => [r.is_default, r.at_time])
  }

  // Left as it is: the default, and no second at the same time.
  let dialog = await newTask('Put the bins out')
  await expect(dialog.getByRole('button', { name: /^Tomorrow 20:00/ })).toContainText('On the day')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect.poll(() => alertsOf('Put the bins out')).toEqual([[true, null]])

  // Changed: mine, at the time I chose, instead of the default.
  dialog = await newTask('Call the vet')
  await dialog.getByRole('button', { name: /^Tomorrow 20:00/ }).click()
  const alert = page.getByRole('dialog', { name: 'Alert' })
  await pickTime(alert.getByRole('combobox', { name: 'Time' }), '19:00')
  await alert.getByRole('button', { name: 'Save' }).click()
  await expect(dialog.getByRole('button', { name: /^Tomorrow 19:00/ })).toBeVisible()
  await expect(dialog.getByRole('button', { name: /^Tomorrow 20:00/ })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect.poll(() => alertsOf('Call the vet')).toEqual([[false, '19:00']])

  // Removed: none.
  dialog = await newTask('Water the plants')
  await dialog.getByRole('button', { name: 'Remove alert Tomorrow 20:00' }).click()
  await expect(dialog.getByRole('button', { name: /^Tomorrow 20:00/ })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect.poll(() => alertsOf('Water the plants')).toEqual([])
})

test('TSK-003, PLA-002 2: ticked done with no day, it leaves; Undo brings it back; one for today stays, struck through', async ({
  page,
}) => {
  await start(page)
  await rowOf(page, 'Fix the gate').getByRole('checkbox').click()
  await expect(rowOf(page, 'Fix the gate')).toBeHidden()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(rowOf(page, 'Fix the gate')).toBeVisible()

  const call = rowOf(page, 'Call mum')
  await call.getByRole('checkbox').click()
  await expect(call.getByRole('checkbox')).toBeChecked()
  await expect(call.getByRole('button', { name: /^Call mum/ })).toHaveCSS(
    'text-decoration-line',
    'line-through',
  )
  await page.reload()
  await expect(call.getByRole('checkbox')).toBeChecked()
  // Done before today, it isn't listed.
  await expect(page.getByText('Return the jacket')).toBeHidden()
  // Unticked, it is open again.
  await call.getByRole('checkbox').click()
  await expect(call.getByRole('checkbox')).not.toBeChecked()
})

test('TSK-007: moved to Someday it loses its date; a date makes it active again', async ({
  page,
}) => {
  const db = await start(page)
  await rowOf(page, 'Take the bins out').getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Someday' }).click()
  const someday = page
    .getByRole('main')
    .locator('section')
    .filter({ hasText: /^Someday/ })
  await expect(someday).toContainText('Take the bins out')
  await expect
    .poll(() => db.items.find((i) => i.id === id(3)))
    .toMatchObject({ status: 'idea', do_on: null })

  await rowOf(page, 'Learn Japanese')
    .getByRole('button', { name: /^Learn Japanese/ })
    .click()
  const task = page.getByRole('dialog', { name: 'Learn Japanese' })
  await task.getByRole('button', { name: 'Do on' }).click()
  await page.getByRole('button', { name: /14th/ }).click()
  await expect
    .poll(() => db.items.find((i) => i.id === id(7)))
    .toMatchObject({ status: 'active', do_on: '2026-10-14' })
})

test("TSK-002, TSK-005, PLA-007: a Task's details, each kept as it is changed; no Labels or sub-tasks", async ({
  page,
}) => {
  const db = await start(page)
  await rowOf(page, 'Renew car insurance')
    .getByRole('button', { name: /^Renew car insurance/ })
    .click()
  // Renaming it renames the popup, so it is found as the one open.
  const task = page.getByRole('dialog')

  await task.getByRole('textbox', { name: 'Title' }).fill('Renew the car insurance')
  await task.getByRole('textbox', { name: 'Notes' }).fill('Admiral quoted £412')
  await task.getByRole('button', { name: 'Star' }).click()

  // A time needs a day: the do-on Calendar opens to ask for it.
  await pickTime(task.getByLabel('Time'), '18:30')
  await page.getByRole('button', { name: /13th/ }).click()

  // PLA-007 1: no Labels or sub-tasks.
  await expect(task.getByText('Labels', { exact: true })).toHaveCount(0)
  await expect(task.getByText('Sub-tasks', { exact: true })).toHaveCount(0)

  await expect
    .poll(() => db.items.find((i) => i.id === id(1)))
    .toMatchObject({
      title: 'Renew the car insurance',
      body: 'Admiral quoted £412',
      do_on: '2026-10-13',
      do_at: '18:30',
    })
  await expect.poll(() => db.marks.some((m) => m.item_id === id(1))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(rowOf(page, 'Renew the car insurance')).toBeVisible()
})
