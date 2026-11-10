import { expect, test, type Page, type Route } from '@playwright/test'
import { itemRow, standIn } from './stand-in'

// Sunday 11 October 2026, 14:00 in London.
const NOW = new Date('2026-10-11T14:00:00+01:00')
const TASK = '01990000-0000-7000-8000-000000000001'
const NOTE = '01990000-0000-7000-8000-000000000002'

test.use({ timezoneId: 'Europe/London' })

async function start(page: Page, path = '/today') {
  await page.clock.setFixedTime(NOW)
  const db = await standIn(page, {
    signedIn: true,
    rows: {
      items: [
        itemRow({ id: TASK, type: 'task', title: 'Renew car insurance' }),
        itemRow({ id: NOTE, type: 'note', title: 'Car details' }),
      ],
      labels: [
        { id: 'l-car', name: 'Car' },
        { id: 'l-home', name: 'Home' },
      ],
    },
  })
  await page.goto(path)
  await expect(page.getByRole('heading').first()).toBeVisible()
  return db
}

/** "New" at the top right: the page header's on a computer, the top bar's on a phone. */
async function openCapture(page: Page) {
  await page.getByRole('button', { name: 'New', exact: true }).first().click()
  const capture = page.getByRole('dialog', { name: 'Capture' })
  await expect(capture.getByRole('textbox')).toBeFocused()
  return capture
}

test('CAP-001, CAP-002: a thought in one line, from any page, and I stay where I was', async ({
  page,
}) => {
  const db = await start(page, '/notes')
  const capture = await openCapture(page)
  await expect(capture.getByRole('button', { name: 'Thought', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await capture.getByRole('textbox').fill('ceramics class for the anniversary?')
  await capture.getByRole('textbox').press('Enter')
  await expect(capture).toBeHidden()
  await expect(page.getByText('Thought saved')).toBeVisible()
  await expect(page).toHaveURL(/\/notes$/)
  await expect
    .poll(() => db.items.find((i) => i.type === 'thought')?.title)
    .toBe('ceramics class for the anniversary?')
})

test('CAP-002: N opens capture on a computer, but not while typing', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a key on a computer')
  await start(page)
  await page.keyboard.press('n')
  const capture = page.getByRole('dialog', { name: 'Capture' })
  await expect(capture.getByRole('textbox')).toBeFocused()
  await capture.getByRole('textbox').press('n')
  await expect(capture.getByRole('textbox')).toHaveValue('n')
  // Nor while capture is open with the switch focused: the line stays.
  await capture.getByRole('button', { name: 'Task', exact: true }).focus()
  await page.keyboard.press('n')
  await expect(capture.getByRole('textbox')).toHaveValue('n')
  await page.keyboard.press('Escape')
  await expect(capture).toBeHidden()
})

test('CAP-001, CAP-003: switched to Task, the date is understood and taken out of the title', async ({
  page,
}) => {
  const db = await start(page)
  const capture = await openCapture(page)
  await capture.getByRole('button', { name: 'Task', exact: true }).click()
  await capture.getByRole('textbox').fill('renew insurance fri')
  await expect(capture.getByText('Fri 16 Oct')).toBeVisible()
  await expect(capture.getByText('09:00')).toBeVisible()
  await capture.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Task saved · Fri')).toBeVisible()
  await expect
    .poll(() => db.items.find((i) => i.type === 'task' && i.id !== TASK))
    .toMatchObject({ title: 'Renew insurance', do_on: '2026-10-16' })
})

test('CAP-001, CAP-004: a dated line is offered as a Task, and kept as a Thought reminds me', async ({
  page,
}) => {
  const db = await start(page)
  let capture = await openCapture(page)
  await capture.getByRole('textbox').fill('call mum fri 6pm')
  const offer = capture.getByRole('button', { name: 'Task, Fri 18:00?' })
  await expect(offer).toBeVisible()
  await expect(capture.getByRole('button', { name: 'Thought', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await capture.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Thought saved')).toBeVisible()
  await expect.poll(() => db.alerts).toHaveLength(1)
  const thought = db.items.find((i) => i.type === 'thought')!
  expect(thought.title).toBe('call mum fri 6pm')
  expect(db.alerts[0]).toMatchObject({
    item_id: thought.id,
    fixed_at: '2026-10-16T17:00:00.000Z',
  })

  capture = await openCapture(page)
  await capture.getByRole('textbox').fill('dentist tue 3pm?')
  await capture.getByRole('button', { name: 'Task, Tue 15:00?' }).click()
  await expect(capture.getByRole('button', { name: 'Task', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(capture.getByText('Tue 13 Oct 15:00')).toBeVisible()
  await capture.getByRole('button', { name: 'Save' }).click()
  await expect
    .poll(() => db.items.find((i) => i.title === 'Dentist?'))
    .toMatchObject({ type: 'task', do_on: '2026-10-13', do_at: '15:00' })
})

test('CAP-009: Labels chosen in capture are given to the Thought or the Task', async ({ page }) => {
  const db = await start(page)
  let capture = await openCapture(page)
  const labels = capture.getByRole('group', { name: 'Labels' }).getByRole('button')
  await expect(labels).toHaveText(['Car', 'Home'])
  await capture.getByRole('textbox').fill('paint the shed')
  await labels.filter({ hasText: 'Home' }).click()
  await expect(labels.filter({ hasText: 'Home' })).toHaveAttribute('aria-pressed', 'true')
  await capture.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Thought saved')).toBeVisible()
  await expect
    .poll(() => {
      const t = db.items.find((i) => i.title === 'paint the shed')
      return t && db.item_labels.filter((r) => r.item_id === t.id).map((r) => r.label_id)
    })
    .toEqual(['l-home'])

  // Opened again, nothing is chosen.
  capture = await openCapture(page)
  await expect(labels.filter({ hasText: 'Home' })).toHaveAttribute('aria-pressed', 'false')
  await capture.getByRole('button', { name: 'Task', exact: true }).click()
  await capture.getByRole('textbox').fill('wash the car')
  await labels.filter({ hasText: 'Car' }).click()
  await capture.getByRole('button', { name: 'Save' }).click()
  await expect
    .poll(() => {
      const t = db.items.find((i) => i.title === 'Wash the car')
      return t && [t.type, db.item_labels.filter((r) => r.item_id === t.id).map((r) => r.label_id)]
    })
    .toEqual(['task', ['l-car']])
})

test('CAP-001: with no signal, what I capture waits to be sorted at once and is sent when the connection returns', async ({
  page,
  context,
}) => {
  const db = await start(page)
  // The stand-in answers before the network, so its writes are refused too.
  const noSignal = (route: Route) => route.abort('internetdisconnected')
  await page.route('**/rest/v1/rpc/**', noSignal)
  await context.setOffline(true)
  const capture = await openCapture(page)
  await capture.getByRole('textbox').fill('buy oat milk')
  await capture.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Thought saved')).toBeVisible()
  // It waits to be sorted at once, counted on Today.
  await expect(page.getByRole('link', { name: '1 thought to sort' })).toBeVisible()
  expect(db.items.some((i) => i.title === 'buy oat milk')).toBe(false)
  await page.unroute('**/rest/v1/rpc/**', noSignal)
  await context.setOffline(false)
  await expect.poll(() => db.items.some((i) => i.title === 'buy oat milk')).toBe(true)
})

test('CAP-002: capture over an open Item leaves it open, and Undo takes the new one back', async ({
  page,
  isMobile,
}) => {
  // On a phone a Note opens on its own page, under the top bar; a computer has N.
  const db = await start(page, isMobile ? `/item/${NOTE}` : `/plan?item=${TASK}`)
  const item = isMobile
    ? page.getByRole('heading', { name: 'Car details' })
    : page.getByRole('dialog', { name: 'Renew car insurance' })
  await expect(item).toBeVisible()
  const url = page.url()
  if (isMobile) await openCapture(page)
  else await page.keyboard.press('n')
  const capture = page.getByRole('dialog', { name: 'Capture' })
  await capture.getByRole('textbox').fill('ask about no-claims bonus')
  await capture.getByRole('button', { name: 'Save' }).click()
  await expect(capture).toBeHidden()
  await expect(item).toBeVisible()
  expect(page.url()).toBe(url)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect
    .poll(() => db.items.find((i) => i.title === 'ask about no-claims bonus')?.archived_at)
    .toBeTruthy()
})
