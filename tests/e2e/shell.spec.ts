import { expect, test } from '@playwright/test'
import { itemRow, standIn } from './stand-in'

// Monday 12 October 2026, 09:00 in London.
const NOW = new Date('2026-10-12T09:00:00+01:00')

test.use({ timezoneId: 'Europe/London' })

async function start(page: import('@playwright/test').Page, path = '/today') {
  await page.clock.setFixedTime(NOW)
  await standIn(page, {
    signedIn: true,
    rows: {
      items: [
        itemRow({
          id: '01990000-0000-7000-8000-000000000701',
          type: 'task',
          title: 'Call mum',
          do_on: '2026-10-12',
        }),
        itemRow({ id: '01990000-0000-7000-8000-000000000702', type: 'note', title: 'Boiler' }),
      ],
    },
  })
  await page.goto(path)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
}

test('capture is "New" at the top right, and the drawer says nothing while all is saved', async ({
  page,
  isMobile,
}) => {
  await start(page)
  await expect(page.getByRole('button', { name: 'New', exact: true })).toBeVisible()
  if (isMobile) await page.getByRole('button', { name: 'Menu' }).click()
  const drawer = page.getByRole('navigation', { name: 'Pages' }).locator('..').locator('..')
  await expect(drawer.getByRole('button', { name: /Capture/ })).toHaveCount(0)
  await expect(page.getByText('All changes saved')).toHaveCount(0)
})

test('whatever can be pressed shows the pointing hand', async ({ page, isMobile }) => {
  test.skip(isMobile, 'A mouse pointer')
  await start(page, '/plan')
  const cursor = (l: import('@playwright/test').Locator) =>
    l.evaluate((el) => getComputedStyle(el).cursor)
  expect(await cursor(page.getByRole('button', { name: 'Call mum' }))).toBe('pointer')
  expect(await cursor(page.getByRole('checkbox', { name: 'Done: Call mum' }))).toBe('pointer')
  expect(await cursor(page.getByRole('tab', { name: 'Recurring' }))).toBe('pointer')
  expect(await cursor(page.getByRole('button', { name: 'New task' }))).toBe('pointer')
})

test('NTE-001: on a phone, New note opens a new Note on its own page', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'The Fab is a phone’s')
  await start(page, '/notes')
  await page.getByRole('button', { name: 'New note' }).click()
  await expect(page).toHaveURL(/\/item\/[0-9a-f-]+\?new=note$/)
})

test('pulled down from the top of a page on a phone, LifeOS reloads', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'A touch screen')
  await start(page)
  const reloaded = page.waitForEvent('load')
  await page.evaluate(() => {
    const target = document.querySelector('[data-slot="scroll-area-viewport"]')!
    const touch = (y: number) => new Touch({ identifier: 1, target, clientX: 200, clientY: y })
    const fire = (type: string, y: number) =>
      target.dispatchEvent(
        new TouchEvent(type, {
          bubbles: true,
          touches: type === 'touchend' ? [] : [touch(y)],
          changedTouches: [touch(y)],
        }),
      )
    fire('touchstart', 200)
    for (let y = 210; y <= 400; y += 10) fire('touchmove', y)
    fire('touchend', 400)
  })
  await reloaded
})

test('OFF-004 2: a change the server refused can be cleared, and the Item is as it was saved', async ({
  page,
  isMobile,
}) => {
  await start(page, '/plan')
  await page.route('**/rest/v1/rpc/update_item', (route) =>
    route.fulfill({ status: 400, json: { code: '23514', message: 'refused' } }),
  )
  await page.getByRole('button', { name: 'Call mum' }).click()
  const task = page.getByRole('dialog', { name: 'Call mum' })
  await task.getByRole('textbox', { name: 'Title' }).fill('Call dad')
  await task.getByRole('button', { name: 'Close' }).click()
  const row = page.locator('[data-slot="item-row"]').filter({ hasText: 'Call dad' })
  await expect(row).toContainText('Not saved')
  if (isMobile) await page.getByRole('button', { name: 'Menu' }).click()
  await expect(page.getByText('1 change not saved')).toBeVisible()
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page.getByText('1 change not saved')).toBeHidden()
  if (isMobile) await page.keyboard.press('Escape')
  await expect(page.locator('[data-slot="item-row"]').filter({ hasText: 'Call mum' })).toBeVisible()
})
