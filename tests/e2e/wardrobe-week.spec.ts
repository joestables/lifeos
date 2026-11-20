import { expect, test, type Locator, type Page } from '@playwright/test'
import { itemRow, standIn, type Rows } from './stand-in'

test.use({ timezoneId: 'Europe/London', locale: 'en-GB' })

/** Wednesday 18 November 2026, midday. */
const NOW = new Date('2026-11-18T12:00:00Z')

const LISTS = {
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
}

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
 * "Work" (the white T-shirt and the jeans) waits in the pane, and was worn
 * on Monday; Thursday has the navy T-shirt and the jeans as single garments.
 */
const rows = (more: Partial<Rows> = {}): Rows => ({
  items: [
    NAVY.item,
    WHITE.item,
    JEANS.item,
    itemRow({ id: 'o-work', type: 'outfit', title: 'Work' }),
    itemRow({ id: 'w-mon', type: 'outfit_worn', title: 'Work', do_on: '2026-11-16' }),
    itemRow({
      id: 'w-thu-1',
      type: 'outfit_worn',
      title: 'Navy Uniqlo T-shirt',
      do_on: '2026-11-19',
    }),
    itemRow({
      id: 'w-thu-2',
      type: 'outfit_worn',
      title: 'Navy Uniqlo Jeans',
      do_on: '2026-11-19',
    }),
  ],
  links: [
    { from_item: 'o-work', to_item: 'g-white', link_type: 'includes' },
    { from_item: 'o-work', to_item: 'g-jeans', link_type: 'includes' },
    { from_item: 'w-mon', to_item: 'o-work', link_type: 'wears' },
  ],
  wardrobe: {
    ...LISTS,
    garment: [NAVY.row, WHITE.row, JEANS.row],
    planned_outfits: [{ outfit_id: 'o-work', position: 'a' }],
    worn_garments: [
      { worn_id: 'w-mon', garment_id: 'g-white' },
      { worn_id: 'w-mon', garment_id: 'g-jeans' },
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
  ...more,
})

async function start(page: Page, r: Rows = rows()) {
  await page.clock.setFixedTime(NOW)
  const db = await standIn(page, { signedIn: true, rows: r })
  await page.goto('/wardrobe?tab=week')
  await expect(page.getByRole('heading', { name: '16 – 22 November' })).toBeVisible()
  return db
}

/** A day: its column on a computer, its section on a phone. */
const day = (page: Page, isMobile: boolean, name: string) =>
  isMobile ? page.getByRole('region', { name }) : page.getByRole('group', { name })

async function drag(page: Page, from: Locator, to: Locator) {
  const a = (await from.boundingBox())!
  const b = (await to.boundingBox())!
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 })
  await page.mouse.up()
}

test.describe('Week', () => {
  test('WRD-020, WRD-025: each day its forecast, outfits and garments; a day gone is quieter', async ({
    page,
    isMobile,
  }) => {
    await start(page)
    const wed = day(page, isMobile, isMobile ? 'Wed 18 Nov' : 'Wed 18')
    await expect(wed.getByLabel('Sunny, 12° and 5°')).toBeVisible()
    const thu = day(page, isMobile, isMobile ? 'Thu 19 Nov' : 'Thu 19')
    await expect(thu.getByLabel('Rain, 9° and 4°, 80% chance of rain')).toBeVisible()
    await expect(thu.locator('[data-slot="day-garment"]')).toHaveCount(2)
    const mon = day(page, isMobile, isMobile ? 'Mon 16 Nov' : 'Mon 16')
    await expect(mon.locator('[data-slot="day-weather"]')).toHaveCount(0)
    await expect(mon.locator('[data-slot="day-outfit"]')).toContainText('Work')
  })

  test('WRD-025 4–5: no place says so once; a failed forecast shows the week without weather', async ({
    page,
  }) => {
    const r = rows({ forecast: 'fail' })
    r.wardrobe!.settings = []
    await start(page, r)
    await expect(page.getByText('No weather yet')).toBeVisible()
    await expect(page.locator('[data-slot="day-weather"]')).toHaveCount(0)
    await expect(page.locator('[data-slot="day-outfit"]')).toHaveCount(1)
  })

  test('WRD-021 3: an outfit dragged from the pane onto a day, leaving the pane, with Undo', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'a mouse, on a computer')
    const db = await start(page)
    const pane = page.getByRole('complementary', { name: 'Planned outfits' })
    await drag(page, pane.locator('[data-slot="planned-outfit"]'), day(page, false, 'Fri 20'))
    await expect(day(page, false, 'Fri 20').locator('[data-slot="day-outfit"]')).toContainText(
      'Work',
    )
    await expect(pane.locator('[data-slot="planned-outfit"]')).toHaveCount(0)
    await expect
      .poll(
        () => db.items.filter((i) => i.type === 'outfit_worn' && i.do_on === '2026-11-20').length,
      )
      .toBe(1)
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(day(page, false, 'Fri 20').locator('[data-slot="day-outfit"]')).toHaveCount(0)
    await expect(pane.locator('[data-slot="planned-outfit"]')).toHaveCount(1)
  })

  test('WRD-021 4: a garment found in the pane dragged onto a day', async ({ page, isMobile }) => {
    test.skip(isMobile, 'a mouse, on a computer')
    const db = await start(page)
    const pane = page.getByRole('complementary', { name: 'Planned outfits' })
    await pane.getByRole('tab', { name: 'Garments' }).click()
    await pane.getByRole('searchbox', { name: 'Search clothes' }).fill('arket')
    await drag(page, pane.locator('[data-slot="garment-line"]').first(), day(page, false, 'Sat 21'))
    await expect(day(page, false, 'Sat 21').locator('[data-slot="day-garment"]')).toHaveCount(1)
    await expect
      .poll(() =>
        db.wardrobe.worn_garments!.some((w) => w.garment_id === 'g-white' && w.worn_id !== 'w-mon'),
      )
      .toBe(true)
  })

  test('WRD-021 5: on a phone, an outfit chosen in the tray, then a day', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'a finger, on a phone')
    const db = await start(page)
    await page.getByRole('button', { name: 'Open Planned outfits' }).click()
    await page
      .getByRole('dialog', { name: 'Planned outfits' })
      .getByRole('button', { name: /^Work/ })
      .click()
    await expect(page.getByText('Choose a day')).toBeVisible()
    await page.getByRole('button', { name: 'Place on Fri 20 Nov' }).click()
    await expect(day(page, true, 'Fri 20 Nov').locator('[data-slot="day-outfit"]')).toContainText(
      'Work',
    )
    await expect.poll(() => db.wardrobe.planned_outfits!.length).toBe(0)
  })

  test('WRD-022: a day\'s "+", an outfit opened from its day, a garment taken off, moved and removed', async ({
    page,
    isMobile,
  }) => {
    const db = await start(page)
    const sat = isMobile ? 'Sat 21 Nov' : 'Sat 21'
    await page.getByRole('button', { name: 'Add to Sat 21 Nov' }).click()
    const add = page.getByRole('dialog', { name: 'Add to Sat 21 Nov' })
    await add.getByRole('button', { name: /Work/ }).click()
    await expect(day(page, isMobile, sat).locator('[data-slot="day-outfit"]')).toContainText('Work')
    await day(page, isMobile, sat).getByRole('button', { name: 'Work, Sat 21 Nov' }).click()
    const popup = page.getByRole('dialog', { name: 'Work' })
    await expect(popup).toContainText('Sat 21 Nov')
    await popup.getByRole('button', { name: 'Take Navy Uniqlo Jeans off Sat 21 Nov' }).click()
    await expect(popup.locator('section [data-slot="garment-line"]')).toHaveCount(1)
    const worn = db.items.find((i) => i.type === 'outfit_worn' && i.do_on === '2026-11-21')!
    await expect
      .poll(() => db.wardrobe.worn_garments!.filter((w) => w.worn_id === worn.id).length)
      .toBe(1)
    // The outfit itself keeps its garments (WRD-022 4).
    expect(
      db.links.filter((l) => l.from_item === 'o-work' && l.link_type === 'includes'),
    ).toHaveLength(2)
    await popup.getByRole('button', { name: 'More' }).click()
    await page.getByRole('menuitem', { name: 'Move to another day' }).click()
    await page.getByRole('dialog', { name: 'Move to' }).getByRole('button', { name: /22/ }).click()
    await expect.poll(() => db.items.find((i) => i.id === worn.id)?.do_on).toBe('2026-11-22')
    const sun = isMobile ? 'Sun 22 Nov' : 'Sun 22'
    await day(page, isMobile, sun).getByRole('button', { name: 'Work, Sun 22 Nov' }).click()
    await page.getByRole('dialog', { name: 'Work' }).getByRole('button', { name: 'More' }).click()
    await page.getByRole('menuitem', { name: 'Remove from Sun 22 Nov' }).click()
    await expect(day(page, isMobile, sun).locator('[data-slot="day-outfit"]')).toHaveCount(0)
    await expect.poll(() => db.items.find((i) => i.id === worn.id)?.archived_at).not.toBeNull()
  })

  test("WRD-023: a day's single garments made an outfit", async ({ page, isMobile }) => {
    const db = await start(page)
    const thu = day(page, isMobile, isMobile ? 'Thu 19 Nov' : 'Thu 19')
    await thu.getByRole('button', { name: 'Create outfit' }).click()
    await expect(thu.locator('[data-slot="day-outfit"]')).toHaveCount(1)
    await expect(thu.locator('[data-slot="day-outfit"] [data-slot="day-garment"]')).toHaveCount(2)
    await expect
      .poll(() => db.items.filter((i) => i.type === 'outfit' && !i.archived_at).length)
      .toBe(2)
  })

  test('WRD-024: worn worked out from days gone, in the popup and by sort', async ({ page }) => {
    await start(page)
    await page.getByRole('tab', { name: 'Wardrobe' }).click()
    await page
      .locator('[data-slot="garment-card"]')
      .filter({ hasText: 'Arket' })
      .getByRole('button', { name: 'Arket' })
      .click()
    const popup = page.getByRole('dialog', { name: 'White Arket T-shirt' })
    await expect(popup).toContainText('1×')
    await expect(popup).toContainText('Mon 16 Nov')
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: /^Sort:/ }).click()
    await page.getByRole('menuitem', { name: 'Times worn' }).click()
    await page.keyboard.press('Escape')
    // Worn on Monday: the white T-shirt and the jeans lead.
    await expect(page.locator('[data-slot="garment-card"]').last()).toContainText('Navy · T-shirt')
  })
})
