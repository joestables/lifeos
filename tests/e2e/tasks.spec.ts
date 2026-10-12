import { expect, test, type Page } from '@playwright/test'
import { itemRow, standIn } from './stand-in'

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
  labels: [
    { id: 'l-car', name: 'Car' },
    { id: 'l-home', name: 'Home' },
  ],
  item_labels: [
    { item_id: id(1), label_id: 'l-car' },
    { item_id: id(5), label_id: 'l-car' },
    { item_id: id(3), label_id: 'l-home' },
  ],
  marks: [{ item_id: id(2) }],
  subtasks: [
    { id: 's1', item_id: id(1), title: 'Get a quote', done: true, position: 'a' },
    { id: 's2', item_id: id(1), title: 'Pay', done: false, position: 'b' },
  ],
})

async function start(page: Page, path = '/tasks') {
  await page.clock.setFixedTime(NOW)
  const db = await standIn(page, { signedIn: true, rows: rows() })
  await page.goto(path)
  await expect(page.getByRole('heading', { name: 'Tasks', level: 1 })).toBeVisible()
  return db
}

const rowOf = (page: Page, title: string) =>
  page.locator('[data-slot="item-row"]').filter({ hasText: title })
const headings = (page: Page) => page.getByRole('main').getByRole('heading', { level: 2 })

test('TSK-004, TSK-006, TSK-007: All tasks by when, Someday last; sub-tasks counted', async ({
  page,
}) => {
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
  await expect(rowOf(page, 'Renew car insurance')).toContainText('Due Thu 8 Oct·Car·1/2')
  await expect(rowOf(page, 'Book MOT')).toContainText('Due Fri 30 Oct')
  await expect(rowOf(page, 'Call mum').getByRole('button', { name: 'Star' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByText('Return the jacket')).toBeHidden()
})

test('TSK-004: By label, a group per Label, then No label', async ({ page }) => {
  await start(page, '/tasks?view=labels')
  const groups = page.getByRole('main').locator('[data-slot="accordion-trigger"]')
  await expect(groups).toHaveText(['Car2', 'Home1', 'No label3'])
  await expect(rowOf(page, 'Take the bins out')).toContainText('Tomorrow')
})

test("TSK-001: a Task added in a Label's group has that Label, its date understood", async ({
  page,
}) => {
  const db = await start(page, '/tasks?view=labels')
  const home = page
    .getByRole('main')
    .locator('[data-slot="accordion-item"]')
    .filter({ hasText: 'Home' })
  await home.getByRole('textbox', { name: 'Add a task' }).fill('clean the gutters on sat')
  await home.getByRole('textbox', { name: 'Add a task' }).press('Enter')
  await expect(home).toContainText('Clean the gutters')
  await expect
    .poll(() => {
      const t = db.items.find((i) => i.title === 'Clean the gutters')
      return (
        t && [t.do_on, db.item_labels.some((r) => r.item_id === t.id && r.label_id === 'l-home')]
      )
    })
    .toEqual(['2026-10-17', true])
})

test('TSK-001: "New task" opens a new Task with all its fields, kept on Save', async ({ page }) => {
  const db = await start(page)
  await page.getByRole('button', { name: 'New task' }).click()
  const dialog = page.getByRole('dialog', { name: 'New task' })
  await expect(dialog.getByRole('textbox', { name: 'Title' })).toBeFocused()
  await expect(dialog.getByRole('button', { name: 'Save' })).toBeDisabled()
  await dialog.getByRole('textbox', { name: 'Title' }).fill('Renew insurance')
  await dialog.getByRole('textbox', { name: 'Notes' }).fill('Policy 123')
  await dialog.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Car' }).click()
  await page.keyboard.press('Escape')
  await dialog.getByPlaceholder('Add a sub-task').fill('Get quotes')
  await dialog.getByPlaceholder('Add a sub-task').press('Enter')
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
          db.item_labels.some((r) => r.item_id === t.id && r.label_id === 'l-car'),
          db.subtasks.filter((x) => x.item_id === t.id).map((x) => x.title),
        ]
      )
    })
    .toEqual(['Policy 123', true, ['Get quotes']])
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

test('TSK-003: ticked done, it leaves; Undo brings it back; Completed lists it', async ({
  page,
}) => {
  await start(page)
  await rowOf(page, 'Fix the gate').getByRole('checkbox').click()
  await expect(rowOf(page, 'Fix the gate')).toBeHidden()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(rowOf(page, 'Fix the gate')).toBeVisible()

  await rowOf(page, 'Fix the gate').getByRole('checkbox').click()
  await page.getByRole('tab', { name: 'Completed' }).click()
  await expect(page.locator('[data-slot="item-row"]')).toHaveText([
    /^Fix the gate/,
    /^Return the jacket/,
  ])
  // Unticked, it is open again.
  await rowOf(page, 'Return the jacket').getByRole('checkbox').click()
  await expect(rowOf(page, 'Return the jacket')).toBeHidden()
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

test("TSK-002, TSK-005, TSK-006: a Task's details, each kept as it is changed", async ({
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
  await task.getByLabel('Time').fill('18:30')
  await page.getByRole('button', { name: /13th/ }).click()

  await task.getByRole('checkbox', { name: 'Done: Pay' }).click()
  await task.getByRole('textbox', { name: 'Add a sub-task' }).fill('File the certificate')
  await task.getByRole('textbox', { name: 'Add a sub-task' }).press('Enter')

  await task.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Home' }).click()
  await page.keyboard.press('Escape')

  await expect
    .poll(() => db.items.find((i) => i.id === id(1)))
    .toMatchObject({
      title: 'Renew the car insurance',
      body: 'Admiral quoted £412',
      do_on: '2026-10-13',
      do_at: '18:30',
    })
  await expect.poll(() => db.marks.some((m) => m.item_id === id(1))).toBe(true)
  await expect
    .poll(() => db.subtasks.filter((s) => s.item_id === id(1)).map((s) => [s.title, s.done]))
    .toEqual([
      ['Get a quote', true],
      ['Pay', true],
      ['File the certificate', false],
    ])
  await expect
    .poll(() =>
      db.item_labels
        .filter((r) => r.item_id === id(1))
        .map((r) => r.label_id)
        .sort(),
    )
    .toEqual(['l-car', 'l-home'])
  await page.keyboard.press('Escape')
  await expect(rowOf(page, 'Renew the car insurance')).toContainText('2/3')
})
