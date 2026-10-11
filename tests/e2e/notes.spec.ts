import { expect, test, type Page } from '@playwright/test'
import { itemRow, standIn } from './stand-in'

const id = (n: number) => `01990000-0000-7000-8000-0000000001${String(n).padStart(2, '0')}`

const rows = () => ({
  items: [
    itemRow({
      id: id(1),
      type: 'note',
      title: 'Japan packing list',
      body: '- [x] Passport\n- [ ] Plug adapters',
      updated_at: '2026-10-05T09:00:00Z',
    }),
    itemRow({
      id: id(2),
      type: 'note',
      title: 'House details',
      body: 'Boiler: Worcester Greenstar',
      updated_at: '2026-10-09T09:00:00Z',
    }),
    itemRow({
      id: id(3),
      type: 'note',
      title: '',
      body: '**Standing desk**\nFlexispot E7',
      updated_at: '2026-10-08T09:00:00Z',
    }),
    itemRow({ id: id(4), type: 'task', title: 'Renew car insurance' }),
  ],
  labels: [
    { id: 'l-home', name: 'Home' },
    { id: 'l-travel', name: 'Travel' },
    { id: 'l-car', name: 'Car' },
  ],
  item_labels: [
    { item_id: id(1), label_id: 'l-travel' },
    { item_id: id(2), label_id: 'l-home' },
    { item_id: id(4), label_id: 'l-car' },
  ],
  marks: [{ item_id: id(1) }],
})

async function start(page: Page) {
  const db = await standIn(page, { signedIn: true, rows: rows() })
  await page.goto('/notes')
  await expect(page.getByRole('heading', { name: 'Notes', level: 1 })).toBeVisible()
  return db
}

const cards = (page: Page) => page.locator('[data-slot="note-card"]')
const card = (page: Page, title: string) => page.getByRole('button', { name: title, exact: true })

/** Back to the Notes page: Close on a computer, the back link on a phone. */
async function closeNote(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole('button', { name: 'Notes' }).click()
  else await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click()
  await expect(page).toHaveURL(/\/notes$/)
}

test('NTE-001, NTE-003: pinned Notes first, then the rest, most recently changed first', async ({
  page,
}) => {
  await start(page)
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Pinned', 'Others'])
  await expect(cards(page)).toHaveText([
    /^Japan packing list.*Passport.*Plug adapters.*Travel$/,
    /^House details/,
    // No title: its first line stands in, without its marks.
    /^Standing deskFlexispot E7$/,
  ])
  await expect(page.getByText('Renew car insurance')).toBeHidden()
})

test('NTE-001: a new Note is kept as I type, and is there when I come back', async ({
  page,
  isMobile,
}) => {
  const db = await start(page)
  await page.getByRole('button', { name: 'New note' }).click()
  const title = page.getByRole('textbox', { name: 'Title' })
  await expect(title).toBeFocused()
  await title.fill('Gift ideas')
  await title.press('Enter')
  await page.keyboard.type('- Le Creuset pan')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Kinto mug')
  await expect
    .poll(() => db.items.find((i) => i.title === 'Gift ideas')?.body)
    .toBe('- Le Creuset pan\n- Kinto mug')
  await closeNote(page, isMobile)
  await expect(cards(page).nth(1)).toHaveText(/^Gift ideas.*Le Creuset pan.*Kinto mug/)

  await card(page, 'Gift ideas').click()
  await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('Gift ideas')
  await expect(page.getByRole('textbox', { name: 'Note' })).toContainText('Kinto mug')
})

test('NTE-001: a new Note closed untouched leaves nothing behind', async ({ page, isMobile }) => {
  const db = await start(page)
  await page.getByRole('button', { name: 'New note' }).click()
  await expect(page.getByRole('textbox', { name: 'Title' })).toBeFocused()
  await closeNote(page, isMobile)
  await expect(cards(page)).toHaveCount(3)
  expect(db.items).toHaveLength(4)
})

test('NTE-001: a changed Note moves to the top of the rest', async ({ page, isMobile }) => {
  const db = await start(page)
  await card(page, 'Standing desk').click()
  await page.getByRole('textbox', { name: 'Title' }).fill('Standing desk')
  await expect.poll(() => db.items.find((i) => i.id === id(3))?.title).toBe('Standing desk')
  await closeNote(page, isMobile)
  await expect(cards(page).nth(1)).toHaveText(/^Standing desk/)
})

test('NTE-002, NTE-003: Labels from the picker narrow the page; pinned stays first', async ({
  page,
  isMobile,
}) => {
  const db = await start(page)
  await card(page, 'Japan packing list').click()
  await page.getByRole('button', { name: 'Label' }).click()
  // The same Labels as Tasks have (ITM-005).
  await expect(page.getByRole('group', { name: 'Labels' }).getByRole('checkbox')).toHaveCount(3)
  await page.getByRole('checkbox', { name: 'Home' }).click()
  await page.getByRole('textbox', { name: 'Label' }).fill('Packing')
  await page.getByRole('button', { name: 'Create "Packing"' }).click()
  await page.keyboard.press('Escape')
  await expect.poll(() => db.item_labels.filter((r) => r.item_id === id(1)).length).toBe(3)
  await closeNote(page, isMobile)

  const tabs = page.getByRole('tablist', { name: 'Label' }).getByRole('tab')
  await expect(tabs).toHaveText(['All', 'Home', 'Packing', 'Travel'])
  await tabs.filter({ hasText: 'Home' }).click()
  await expect(cards(page)).toHaveText([/^Japan packing list/, /^House details/])
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Pinned', 'Others'])
  await tabs.filter({ hasText: 'All' }).click()
  await expect(cards(page)).toHaveCount(3)
})

test('NTE-004: lists, checklists and bold, from the keyboard; a ticked line stays ticked', async ({
  page,
}) => {
  const db = await start(page)
  await page.getByRole('button', { name: 'New note' }).click()
  await page.getByRole('textbox', { name: 'Title' }).fill('House jobs')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('textbox', { name: 'Note' })).toBeFocused()
  await page.keyboard.type('[ ] Service the boiler')
  await page.getByRole('checkbox', { name: 'Done: Service the boiler' }).click()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await page.keyboard.press('ControlOrMeta+b')
  await page.keyboard.type('Bin day')
  await page.keyboard.press('ControlOrMeta+b')
  await page.keyboard.type(': Monday')
  await page.keyboard.press('Enter')
  await page.keyboard.type('1. Gutters')
  await expect
    .poll(() => db.items.find((i) => i.title === 'House jobs')?.body)
    .toBe('- [x] Service the boiler\n\n**Bin day**: Monday\n\n1. Gutters')
})
