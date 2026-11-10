import { expect, test, type Page } from '@playwright/test'
import { itemRow, standIn } from './stand-in'

// Monday 12 October 2026, 09:00 in London.
const NOW = new Date('2026-10-12T09:00:00+01:00')
const id = (n: number) => `01990000-0000-7000-8000-0000000003${String(n).padStart(2, '0')}`

test.use({ timezoneId: 'Europe/London' })

const series = (sid: string, rule: string, title: string, startsOn: string) => ({
  id: sid,
  mode: 'schedule',
  rule,
  starts_on: startsOn,
  timezone: 'Europe/London',
  template: { title },
  ended_on: null,
})
const occ = (n: number, sid: string, title: string, on: string, fields = {}) =>
  itemRow({
    id: id(n),
    type: 'task',
    title,
    do_on: on,
    series_id: sid,
    occurrence_on: on,
    ...fields,
  })

const rows = () => ({
  items: [
    itemRow({ id: id(1), type: 'task', title: 'Take the bins out', do_on: '2026-10-12' }),
    itemRow({ id: id(2), type: 'task', title: 'Descale the kettle', do_on: '2026-10-12' }),
    itemRow({ id: id(3), type: 'task', title: 'Pay the window cleaner', do_on: '2026-10-12' }),
    // Daily, missed on Saturday and Sunday.
    occ(10, 'vitamins', 'Vitamins', '2026-10-10'),
    occ(11, 'vitamins', 'Vitamins', '2026-10-11'),
    occ(12, 'vitamins', 'Vitamins', '2026-10-12'),
    occ(13, 'vitamins', 'Vitamins', '2026-10-13'),
    // Daily, Sunday's changed.
    occ(20, 'stretch', 'Stretch (sore back)', '2026-10-11', {
      touched_at: '2026-10-11T20:00:00Z',
    }),
    occ(21, 'stretch', 'Stretch', '2026-10-12'),
    // Weekly on Monday; the 26th changed.
    occ(30, 'recycling', 'Recycling', '2026-10-12'),
    occ(31, 'recycling', 'Recycling', '2026-10-19'),
    occ(32, 'recycling', 'Recycling (after half term)', '2026-10-26', {
      touched_at: '2026-10-11T20:00:00Z',
    }),
    occ(33, 'recycling', 'Recycling', '2026-11-02'),
  ],
  series: [
    series('vitamins', 'FREQ=DAILY', 'Vitamins', '2026-10-10'),
    series('stretch', 'FREQ=DAILY', 'Stretch', '2026-10-11'),
    series('recycling', 'FREQ=WEEKLY;BYDAY=MO', 'Recycling', '2026-10-12'),
  ],
})

async function start(page: Page, path = '/plan') {
  await page.clock.setFixedTime(NOW)
  const db = await standIn(page, { signedIn: true, rows: rows() })
  await page.goto(path)
  await expect(page.getByRole('heading', { name: 'Plan', level: 1 })).toBeVisible()
  return db
}

const rowOf = (page: Page, title: string | RegExp) =>
  page.locator('[data-slot="item-row"]').filter({ hasText: title })
/** The open one of a repeating Task's rows: one ticked today stays beside it (PLA-002 2). */
const open = (page: Page, title: string) =>
  rowOf(page, title).filter({ has: page.getByRole('checkbox', { checked: false }) })

async function openTask(page: Page, title: string) {
  await rowOf(page, title)
    .first()
    .getByRole('button', { name: new RegExp(`^${title.replace(/[()]/g, '\\$&')}`) })
    .click()
  return page.getByRole('dialog', { name: title })
}

test('TSK-008: a Task repeats every Monday; only its next shows, and ticking it brings the one after', async ({
  page,
}) => {
  const db = await start(page)
  const task = await openTask(page, 'Take the bins out')
  await task.getByRole('button', { name: 'Repeat' }).click()
  const repeat = page.getByRole('dialog', { name: 'Repeat' })
  // A new repeat: on a schedule, weekly, on the Task's own day.
  await expect(repeat.getByRole('radio', { name: /On a schedule/ })).toBeChecked()
  await expect(repeat.getByRole('button', { name: 'Monday' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await repeat.getByRole('button', { name: 'Save' }).click()
  await expect(task.getByRole('button', { name: 'Repeat' })).toHaveText('Every Monday')
  await page.keyboard.press('Escape')

  await expect(rowOf(page, 'Take the bins out')).toHaveCount(1)
  await expect(rowOf(page, 'Take the bins out')).toContainText('Weekly')
  // ADR-0045: twelve weeks ahead and the one after, made on the device.
  await expect.poll(() => db.items.filter((i) => i.title === 'Take the bins out').length).toBe(14)

  await page.getByRole('tab', { name: 'Recurring' }).click()
  const schedule = page
    .getByRole('main')
    .locator('section')
    .filter({ hasText: /^Tasks/ })
  // Soonest first: Sunday's Stretch, then today's.
  await expect(schedule.locator('[data-slot="item-row"]')).toHaveText([
    /^Stretch \(sore back\).*Every day/,
    /^Recycling.*Every Monday/,
    /^Take the bins out.*Every Monday/,
    /^Vitamins.*Every day/,
  ])

  await page.getByRole('tab', { name: 'Tasks' }).click()
  await rowOf(page, 'Take the bins out').getByRole('checkbox').click()
  // Ticked, it stays in Today, struck through (PLA-002 2); the next one waits.
  await expect(open(page, 'Take the bins out')).toContainText('Mon 19 Oct')
})

test('TSK-008: monthly on the nth weekday, with an end', async ({ page }) => {
  const db = await start(page)
  const task = await openTask(page, 'Pay the window cleaner')
  await task.getByRole('button', { name: 'Repeat' }).click()
  const repeat = page.getByRole('dialog', { name: 'Repeat' })
  await repeat.getByRole('combobox', { name: 'Unit' }).click()
  await page.getByRole('option', { name: 'Month' }).click()
  await repeat.getByLabel('On', { exact: true }).click()
  await page.getByRole('option', { name: 'The second Monday' }).click()
  await repeat.getByLabel('Ends', { exact: true }).click()
  await page.getByRole('option', { name: 'After a number of times' }).click()
  await repeat.getByRole('spinbutton', { name: 'Times' }).fill('6')
  await repeat.getByRole('button', { name: 'Save' }).click()
  await expect(task.getByRole('button', { name: 'Repeat' })).toHaveText(
    'Monthly on the second Monday, 6 times',
  )
  await expect
    .poll(() => db.series.find((s) => s.rule === 'FREQ=MONTHLY;BYDAY=2MO;COUNT=6')?.mode)
    .toBe('schedule')
  // Twelve weeks ahead and the one after; the nightly run makes the rest.
  await expect
    .poll(() =>
      db.items
        .filter((i) => i.title === 'Pay the window cleaner')
        .map((i) => i.do_on)
        .sort(),
    )
    .toEqual(['2026-10-12', '2026-11-09', '2026-12-14', '2027-01-11'])
})

test('TSK-009: three months after it is done', async ({ page }) => {
  const db = await start(page)
  const task = await openTask(page, 'Descale the kettle')
  await task.getByRole('button', { name: 'Repeat' }).click()
  const repeat = page.getByRole('dialog', { name: 'Repeat' })
  await repeat.getByText("After it's done").click()
  await repeat.getByLabel('Comes back after').fill('3')
  await repeat.getByRole('combobox', { name: 'Unit' }).click()
  await page.getByRole('option', { name: 'Months' }).click()
  await repeat.getByRole('button', { name: 'Save' }).click()
  await expect(task.getByRole('button', { name: 'Repeat' })).toHaveText("3 months after it's done")
  await task.getByRole('checkbox', { name: 'Done' }).click()
  await page.keyboard.press('Escape')
  await expect
    .poll(() =>
      db.items.filter((i) => i.title === 'Descale the kettle').map((i) => [i.status, i.do_on]),
    )
    .toEqual([
      ['done', '2026-10-12'],
      ['active', '2027-01-12'],
    ])
  await expect(open(page, 'Descale the kettle')).toContainText('Tue 12 Jan')
})

test('TSK-010: a missed repeat is skipped, unless I had changed it', async ({ page }) => {
  await start(page)
  const today = page
    .getByRole('main')
    .locator('section')
    .filter({ hasText: /^Today/ })
  await expect(rowOf(page, 'Vitamins')).toHaveCount(1)
  await expect(today).toContainText('Vitamins')
  await expect(rowOf(page, 'Vitamins')).not.toContainText('Since')
  // Sunday's Stretch was changed, so it stays; Monday's waits behind it.
  await expect(rowOf(page, /^Stretch/)).toHaveCount(1)
  await expect(rowOf(page, 'Stretch (sore back)')).toContainText('Since yesterday')

  // Today shows the same.
  await page.goto('/today')
  await expect(rowOf(page, 'Vitamins')).toHaveCount(1)
  await expect(rowOf(page, /^Stretch/)).toHaveText(/^Stretch \(sore back\)/)
})

test('TSK-011: one occurrence changes alone; a new repeat from it on; stopping keeps what I changed', async ({
  page,
}) => {
  const db = await start(page)
  let task = await openTask(page, 'Recycling')
  await task.getByRole('textbox', { name: 'Title' }).fill('Recycling and glass')
  await page.keyboard.press('Escape')
  await expect
    .poll(() => db.items.filter((i) => i.series_id === 'recycling').map((i) => i.title))
    .toEqual(['Recycling and glass', 'Recycling', 'Recycling (after half term)', 'Recycling'])

  // Every Tuesday from here on.
  task = await openTask(page, 'Recycling and glass')
  await task.getByRole('button', { name: 'Repeat' }).click()
  let repeat = page.getByRole('dialog', { name: 'Repeat' })
  await repeat.getByRole('button', { name: 'Monday' }).click()
  await repeat.getByRole('button', { name: 'Tuesday' }).click()
  await repeat.getByRole('button', { name: 'Save' }).click()
  await expect(task.getByRole('button', { name: 'Repeat' })).toHaveText('Every Tuesday')
  await expect
    .poll(() =>
      db.items
        .filter((i) => i.series_id === 'recycling')
        .map((i) => [i.occurrence_on, i.archived_at === null]),
    )
    // Only the one I had changed is kept.
    .toEqual([
      ['2026-10-19', false],
      ['2026-10-26', true],
      ['2026-11-02', false],
    ])
  expect(db.series.find((s) => s.id === 'recycling')?.ended_on).toBe('2026-10-11')
  await expect(task.getByRole('button', { name: 'Do on' })).toHaveText('Tomorrow')

  // Stopped: future ones I hadn't changed go.
  await task.getByRole('button', { name: 'Repeat' }).click()
  repeat = page.getByRole('dialog', { name: 'Repeat' })
  await repeat.getByRole('button', { name: "Don't repeat" }).click()
  await expect(task.getByRole('button', { name: 'Repeat' })).toHaveText('None')
  const tuesdays = db.series.find((s) => s.rule === 'FREQ=WEEKLY;BYDAY=TU')!
  await expect
    .poll(
      () => db.items.filter((i) => i.series_id === tuesdays.id && i.archived_at === null).length,
    )
    .toBe(1)
  await page.keyboard.press('Escape')
  await expect(rowOf(page, 'Recycling and glass')).not.toContainText('Weekly')
})
