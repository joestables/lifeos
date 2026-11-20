import { expect, test, type Page } from '@playwright/test'
import { itemRow, standIn, type Rows } from './stand-in'

test.use({ timezoneId: 'Europe/London', locale: 'en-GB' })

/** Wednesday 18 November 2026, midday. */
const NOW = new Date('2026-11-18T12:00:00Z')

const garment = (id: string, title: string, row: Record<string, string>) => ({
  item: itemRow({ id, type: 'garment', title }),
  row: { item_id: id, size_id: 's-m', fit_id: null, own_name: null, ...row },
})
const NAVY = garment('g-navy', 'Navy Uniqlo T-shirt', {
  category_id: 'c-tee',
  brand_id: 'b-uniqlo',
  colour_id: 'k-navy',
})
const WHITE = garment('g-white', 'White Arket T-shirt', {
  category_id: 'c-tee',
  brand_id: 'b-arket',
  colour_id: 'k-white',
})
const JEANS = garment('g-jeans', 'Navy Uniqlo Jeans', {
  category_id: 'c-jeans',
  brand_id: 'b-uniqlo',
  colour_id: 'k-navy',
})

/**
 * "Work" (the white T-shirt and the jeans) is worn today, Wednesday;
 * Thursday has the navy T-shirt and the jeans as single garments.
 */
const rows = (): Rows => ({
  items: [
    NAVY.item,
    WHITE.item,
    JEANS.item,
    itemRow({ id: 'o-work', type: 'outfit', title: 'Work' }),
    itemRow({ id: 'w-wed', type: 'outfit_worn', title: 'Work', do_on: '2026-11-18' }),
    itemRow({ id: 'w-thu-1', type: 'outfit_worn', title: NAVY.item.title, do_on: '2026-11-19' }),
    itemRow({ id: 'w-thu-2', type: 'outfit_worn', title: JEANS.item.title, do_on: '2026-11-19' }),
    itemRow({ id: 't-1', type: 'task', title: 'Post the parcel', do_on: '2026-11-19' }),
  ],
  links: [
    { from_item: 'o-work', to_item: 'g-white', link_type: 'includes' },
    { from_item: 'o-work', to_item: 'g-jeans', link_type: 'includes' },
    { from_item: 'w-wed', to_item: 'o-work', link_type: 'wears' },
  ],
  wardrobe: {
    categories: [
      { id: 'c-tee', name: 'T-shirt', position: 'a' },
      { id: 'c-jeans', name: 'Jeans', position: 'b' },
    ],
    sizes: [{ id: 's-m', name: 'M', position: 'a' }],
    brands: [
      { id: 'b-uniqlo', name: 'Uniqlo' },
      { id: 'b-arket', name: 'Arket' },
    ],
    colours: [
      { id: 'k-navy', name: 'Navy', hex: '#1f2a44' },
      { id: 'k-white', name: 'White', hex: '#f3f1ec' },
    ],
    garment: [NAVY.row, WHITE.row, JEANS.row],
    planned_outfits: [],
    worn_garments: [
      { worn_id: 'w-wed', garment_id: 'g-white' },
      { worn_id: 'w-wed', garment_id: 'g-jeans' },
      { worn_id: 'w-thu-1', garment_id: 'g-navy' },
      { worn_id: 'w-thu-2', garment_id: 'g-jeans' },
    ],
    settings: [
      { place_name: 'Manchester, England, United Kingdom', latitude: 53.48, longitude: -2.24 },
    ],
  },
  forecast: {
    time: ['2026-11-18', '2026-11-19', '2026-11-20'],
    weather_code: [0, 61, 3],
    temperature_2m_max: [12.4, 9, 10],
    temperature_2m_min: [5, 4.2, 6],
    precipitation_probability_max: [5, 80, 10],
  },
})

async function start(page: Page, path: string) {
  await page.clock.setFixedTime(NOW)
  const db = await standIn(page, { signedIn: true, rows: rows() })
  await page.goto(path)
  return db
}

const day = (page: Page, name: string) => page.getByRole('group', { name, exact: true })
const cards = (scope: ReturnType<Page['locator']>) => scope.locator('[data-slot="plan-card"]')

test.describe('the day’s clothes on Week', () => {
  test.skip(({ isMobile }) => isMobile, 'The week is a computer’s')

  test('WRD-026 1–2, WEK-003: one orange card a day, opening the day’s clothes and weather', async ({
    page,
  }) => {
    await start(page, '/week')
    await expect(cards(day(page, 'Wed 18'))).toHaveText([/Outfit\s*Work/])
    await expect(cards(day(page, 'Thu 19'))).toHaveText([/Post the parcel/, /Outfit\s*2 garments/])
    await expect(cards(day(page, 'Thu 19')).last()).toHaveAttribute('data-colour', 'orange')
    await expect(
      cards(day(page, 'Thu 19')).last().locator('[data-slot=garment-photo]'),
    ).toHaveCount(2)

    await day(page, 'Thu 19').getByRole('button', { name: '2 garments' }).click()
    const popup = page.getByRole('dialog', { name: 'Thu 19 November' })
    await expect(popup).toContainText('Outfit')
    await expect(popup.locator('[data-slot=day-weather]')).toBeVisible()
    await expect(popup.locator('[data-slot=garment-line]')).toHaveCount(2)
    await popup.getByRole('button', { name: 'Open in Wardrobe' }).click()
    await expect(page).toHaveURL(/\/wardrobe\?tab=week&day=2026-11-19/)
    await expect(page.getByRole('heading', { name: '16 – 22 November' })).toBeVisible()
  })

  test('WEK-003 2–3: Outfits is a Type to show, and a day’s "+" adds an outfit', async ({
    page,
  }) => {
    await start(page, '/week')
    const pill = page.getByRole('button', { name: 'Outfits', exact: true })
    await pill.click()
    await expect(cards(day(page, 'Wed 18'))).toHaveCount(0)
    await pill.click()
    await expect(cards(day(page, 'Wed 18'))).toHaveCount(1)

    const fri = day(page, 'Fri 20')
    await fri.hover()
    await fri.getByRole('button', { name: 'Add to Fri 20 Nov' }).click()
    await page.getByRole('menuitem', { name: 'Outfit' }).click()
    const add = page.getByRole('dialog', { name: 'Add to Fri 20 Nov' })
    await add.getByRole('button', { name: /Work/ }).click()
    await expect(cards(fri)).toHaveText([/Outfit\s*Work/])
  })

  test('WRD-026 4: dragging the card moves every outfit and garment on it, with Undo', async ({
    page,
  }) => {
    const db = await start(page, '/week')
    await cards(day(page, 'Thu 19')).filter({ hasText: '2 garments' }).dragTo(day(page, 'Sat 21'))
    await expect(cards(day(page, 'Sat 21'))).toHaveText([/2 garments/])
    await expect(cards(day(page, 'Thu 19'))).toHaveText([/Post the parcel/])
    await expect
      .poll(() => db.items.filter((i) => String(i.id).startsWith('w-thu')).map((i) => i.do_on))
      .toEqual(['2026-11-21', '2026-11-21'])
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(cards(day(page, 'Thu 19'))).toHaveText([/Post the parcel/, /2 garments/])
  })
})

test('WRD-026 1–2: Today has the day’s clothes as one row, opening them', async ({ page }) => {
  await start(page, '/today')
  const row = page.getByRole('button', { name: 'Work' })
  await expect(row).toBeVisible()
  await row.click()
  const popup = page.getByRole('dialog', { name: 'Wed 18 November' })
  await expect(popup.getByRole('heading', { name: 'Work' })).toBeVisible()
  await expect(popup.locator('[data-slot=day-weather]')).toBeVisible()
  await expect(popup.locator('[data-slot=garment-line]')).toHaveCount(2)
})

test('WRD-027 2: Search finds garments and outfits, opening them in Wardrobe', async ({
  page,
  isMobile,
}) => {
  await start(page, '/today')
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible()
  if (isMobile) await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  const input = page.getByRole('combobox', { name: 'Search' })
  const results = page.getByRole('listbox', { name: 'Search' })
  await input.fill('jeans')
  await expect(results.getByRole('group', { name: 'Garments' })).toContainText('Navy Uniqlo Jeans')
  await input.fill('work')
  await expect(results.getByRole('option')).toHaveText([/Work/])
  await expect(results.getByRole('group', { name: 'Outfits' })).toBeVisible()
  await input.fill('uniqlo t')
  await results.getByRole('option', { name: /Navy Uniqlo T-shirt/ }).click()
  await expect(page).toHaveURL(/\/wardrobe\?garment=g-navy/)
  await expect(page.getByRole('dialog', { name: 'Navy Uniqlo T-shirt' })).toBeVisible()
})

test('WRD-027 1: with no signal, every tab opens', async ({ page, context }) => {
  await start(page, '/wardrobe')
  await expect(page.locator('[data-slot="garment-card"]')).toHaveCount(3)
  await context.setOffline(true)
  await page.getByRole('tab', { name: 'Outfits' }).click()
  await expect(page.getByText('Work').first()).toBeVisible()
  await page.getByRole('tab', { name: 'Week' }).click()
  await expect(page.getByRole('heading', { name: '16 – 22 November' })).toBeVisible()
})
