import { expect, test, type Page } from '@playwright/test'
import { itemRow, standIn } from './stand-in'

// Monday 12 October 2026, 09:00 in London.
const NOW = new Date('2026-10-12T09:00:00+01:00')
const id = (n: number) => `01990000-0000-7000-8000-0000000005${String(n).padStart(2, '0')}`

test.use({ timezoneId: 'Europe/London' })

const rows = () => ({
  items: [
    itemRow({ id: id(1), type: 'task', title: 'Renew car insurance', due_on: '2026-10-08' }),
    itemRow({
      id: id(2),
      type: 'task',
      title: 'Check travel insurance covers Japan',
      status: 'done',
      updated_at: '2026-10-04T10:00:00Z',
    }),
    itemRow({
      id: id(3),
      type: 'note',
      title: 'House details',
      body: 'Boiler serviced in May\n\nHome insurance renews in January',
    }),
    itemRow({
      id: id(4),
      type: 'thought',
      title: 'Is the bike covered by home insurance?',
      created_at: '2026-10-06T10:00:00Z',
    }),
    itemRow({
      id: id(5),
      type: 'task',
      title: 'Cancel old insurance',
      archived_at: '2026-10-10T10:00:00Z',
    }),
    itemRow({ id: id(6), type: 'task', title: 'Phone the garage' }),
    // A repeating Task: this week's and next week's occurrences.
    itemRow({
      id: id(7),
      type: 'task',
      title: 'Pay insurance premium',
      series_id: 's-pay',
      occurrence_on: '2026-10-16',
      do_on: '2026-10-16',
    }),
    itemRow({
      id: id(8),
      type: 'task',
      title: 'Pay insurance premium',
      series_id: 's-pay',
      occurrence_on: '2026-10-23',
      do_on: '2026-10-23',
    }),
  ],
  labels: [{ id: 'l-ins', name: 'Insurance' }],
  item_labels: [{ item_id: id(6), label_id: 'l-ins' }],
  series: [
    {
      id: 's-pay',
      rule: 'FREQ=WEEKLY;BYDAY=FR',
      mode: 'schedule',
      starts_on: '2026-10-16',
      ended_on: null,
      template: { title: 'Pay insurance premium' },
    },
  ],
})

async function start(page: Page, path = '/inbox') {
  await page.clock.setFixedTime(NOW)
  const db = await standIn(page, { signedIn: true, rows: rows() })
  await page.goto(path)
  await expect(page.getByRole('heading', { name: 'Inbox', level: 1 })).toBeVisible()
  return db
}

/** Search from the drawer: a popup over the page. */
async function openSearch(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  const input = page.getByRole('combobox', { name: 'Search' })
  await expect(input).toBeFocused()
  return input
}

const results = (page: Page) => page.getByRole('listbox', { name: 'Search' })

test('SRC-001: I type a few words and find the Items, by Type, best match first', async ({
  page,
  isMobile,
}) => {
  await start(page)
  const input = await openSearch(page, isMobile)
  await input.fill('insur')

  const list = results(page)
  await expect(list.getByRole('group')).toHaveText([/^Tasks/, /^Thoughts/, /^Notes/])
  const tasks = list.getByRole('group', { name: 'Tasks' }).getByRole('option')
  await expect(tasks).toHaveText([
    /^Renew car insurance\s*Due Thu 8 Oct$/,
    /^Check travel insurance covers Japan\s*Completed Sun 4 Oct$/,
    /^Pay insurance premium\s*Fri 16 Oct$/,
    /^Phone the garage\s*Insurance$/,
  ])
  // The match in bold.
  await expect(tasks.first().locator('strong').first()).toHaveText('insur')
  await expect(list.getByRole('group', { name: 'Notes' })).toContainText(
    'House detailsHome insurance renews in January',
  )
  await expect(list.getByRole('group', { name: 'Thoughts' })).toContainText(
    'Is the bike covered by home insurance?Tue',
  )

  // SRC-001 3: a deleted Item isn't found.
  await expect(list).not.toContainText('Cancel old insurance')

  // Every word counts; both in the title is the better match.
  await input.fill('home insur')
  await expect(list.getByRole('option')).toHaveText([/^Is the bike covered/, /^House details/])
  await input.fill('zebra')
  await expect(page.getByRole('status').filter({ hasText: 'Nothing found' })).toBeVisible()
})

test('SRC-001 1: / opens Search on a computer, and Escape closes it', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'A key on a computer')
  await start(page)
  await page.keyboard.press('/')
  const input = page.getByRole('combobox', { name: 'Search' })
  await expect(input).toBeFocused()
  await expect(input).toHaveValue('')
  await page.keyboard.press('Escape')
  await expect(input).toBeHidden()
})

test('SRC-001 4: choosing a result opens the Item', async ({ page, isMobile }) => {
  await start(page)
  const input = await openSearch(page, isMobile)
  await input.fill('insur')
  await expect(results(page).getByRole('option').first()).toHaveText(/^Renew car insurance/)

  if (isMobile) {
    await results(page).getByRole('option', { name: 'House details' }).click()
    await expect(page).toHaveURL(new RegExp(`/item/${id(3)}$`))
    await expect(page.getByRole('heading', { name: 'House details' })).toBeVisible()
    await expect(input).toBeHidden()
  } else {
    // The arrow keys move the highlight; Enter opens it.
    await input.press('ArrowDown')
    await expect(results(page).getByRole('option', { selected: true })).toHaveText(
      /^Check travel insurance/,
    )
    await input.press('Enter')
    await expect(input).toBeHidden()
    await expect(
      page.getByRole('dialog', { name: 'Check travel insurance covers Japan' }),
    ).toBeVisible()
  }
})

test('SRC-002: offline, the Items on the device are searched, and I am told it may be incomplete', async ({
  page,
  context,
  isMobile,
}) => {
  await start(page)
  const input = await openSearch(page, isMobile)
  await context.setOffline(true)
  await input.fill('insur')
  await expect(
    page.getByRole('status').filter({ hasText: 'Offline · Results may be incomplete' }),
  ).toBeVisible()
  // Title matches first, then Labels, then bodies; grouped by Type.
  await expect(results(page).getByRole('option')).toHaveText([
    /^Check travel insurance/,
    /^Renew car insurance/,
    /^Pay insurance premium/,
    /^Phone the garage/,
    /^Is the bike covered/,
    /^House details/,
  ])
  await context.setOffline(false)
})

test('SRC-001: Search closes with a tap outside it', async ({ page, isMobile }) => {
  await start(page)
  const input = await openSearch(page, isMobile)
  await page.mouse.click(10, 800)
  await expect(input).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Inbox', level: 1 })).toBeVisible()
})
