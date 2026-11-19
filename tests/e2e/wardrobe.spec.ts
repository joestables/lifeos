import { expect, test, type Page } from '@playwright/test'
import { itemRow, standIn, type Rows } from './stand-in'

/**
 * The camera, stood in by a canvas: a navy T-shirt on a pale bed, as a
 * phone photographs one (WRD-005 1, WRD-006 1).
 */
async function fakeCamera(page: Page, garment = '#1f2a44') {
  await page.addInitScript((hex) => {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 480
    const ctx = canvas.getContext('2d')!
    const draw = () => {
      ctx.fillStyle = '#e4e2dd'
      ctx.fillRect(0, 0, 640, 480)
      ctx.fillStyle = hex
      ctx.beginPath()
      for (const [x, y] of [
        [250, 110],
        [390, 110],
        [480, 160],
        [450, 230],
        [410, 210],
        [410, 400],
        [230, 400],
        [230, 210],
        [190, 230],
        [160, 160],
      ])
        ctx.lineTo(x!, y!)
      ctx.fill()
    }
    draw()
    setInterval(draw, 100)
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: async () => canvas.captureStream(10) },
    })
  }, garment)
}

const LISTS = {
  categories: [
    { id: 'c-tee', name: 'T-shirt', position: 'a' },
    { id: 'c-jeans', name: 'Jeans', position: 'b' },
  ],
  sizes: [
    { id: 's-s', name: 'S', position: 'a' },
    { id: 's-m', name: 'M', position: 'b' },
    { id: 's-32', name: '32', position: 'c' },
  ],
  brands: [
    { id: 'b-uniqlo', name: 'Uniqlo' },
    { id: 'b-arket', name: 'Arket' },
  ],
  fits: [{ id: 'f-slim', name: 'Slim' }],
  tags: [{ id: 't-gym', name: 'Gym' }],
  colours: [
    { id: 'k-navy', name: 'Navy', hex: '#1f2a44' },
    { id: 'k-white', name: 'White', hex: '#f3f1ec' },
  ],
}

const g = (
  id: string,
  title: string,
  row: Record<string, unknown>,
  item: Record<string, unknown> = {},
) => ({
  item: itemRow({ id, type: 'garment', title, ...item }),
  row: { item_id: id, fit_id: null, own_name: null, ...row },
})

const GARMENTS = [
  g(
    'g-navy',
    'Navy Uniqlo T-shirt',
    {
      category_id: 'c-tee',
      size_id: 's-m',
      brand_id: 'b-uniqlo',
      colour_id: 'k-navy',
      fit_id: 'f-slim',
    },
    { created_at: '2026-11-03T09:00:00Z' },
  ),
  g(
    'g-white',
    'White Arket T-shirt',
    { category_id: 'c-tee', size_id: 's-s', brand_id: 'b-arket', colour_id: 'k-white' },
    { created_at: '2026-11-02T09:00:00Z' },
  ),
  g(
    'g-jeans',
    'Navy Uniqlo Jeans',
    { category_id: 'c-jeans', size_id: 's-32', brand_id: 'b-uniqlo', colour_id: 'k-navy' },
    { created_at: '2026-11-01T09:00:00Z' },
  ),
]

const WARDROBE: Rows = {
  items: GARMENTS.map((x) => x.item),
  wardrobe: { ...LISTS, garment: GARMENTS.map((x) => x.row), garment_tags: [] },
}

async function start(page: Page, rows: Rows = WARDROBE) {
  const db = await standIn(page, { signedIn: true, rows })
  await page.goto('/wardrobe')
  await expect(page.getByRole('heading', { name: 'Wardrobe', level: 1 })).toBeVisible()
  return db
}

const cards = (page: Page) => page.locator('[data-slot="garment-card"]')
const card = (page: Page, brand: string, colour: string, category: string) =>
  cards(page)
    .filter({ hasText: brand })
    .filter({ hasText: `${colour} · ${category}` })

/** Select, or on a phone a long press by touch on the first card (WRD-012 1). */
async function select(page: Page, isMobile: boolean) {
  if (!isMobile) return page.getByRole('button', { name: 'Select' }).click()
  const first = cards(page).first()
  await first.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true })
  await page.waitForTimeout(700)
  await first.dispatchEvent('pointerup', { pointerType: 'touch', isPrimary: true })
}

async function newGarment(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole('button', { name: 'New garment' }).last().click()
  else await page.getByRole('button', { name: 'New garment' }).first().click()
}

test.describe('Wardrobe', () => {
  test('WRD-001 3: no categories or sizes yet says to add them in Settings', async ({
    page,
    isMobile,
  }) => {
    await start(page, { items: [] })
    await expect(page.getByText('No garments yet')).toBeVisible()
    await newGarment(page, isMobile)
    await expect(page.getByText('Add categories and sizes first')).toBeVisible()
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Wardrobe', level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible()
  })

  test('WRD-001 1: every Owned garment as a card, Retired ones not', async ({ page }) => {
    const rows: Rows = {
      ...WARDROBE,
      items: [
        ...WARDROBE.items!,
        itemRow({ id: 'g-old', type: 'garment', title: 'Old', status: 'cancelled' }),
      ],
      wardrobe: {
        ...WARDROBE.wardrobe,
        garment: [
          ...WARDROBE.wardrobe!.garment!,
          {
            item_id: 'g-old',
            category_id: 'c-tee',
            size_id: 's-m',
            brand_id: 'b-arket',
            colour_id: 'k-white',
            fit_id: null,
            own_name: null,
          },
        ],
      },
    }
    await start(page, rows)
    await expect(cards(page)).toHaveCount(3)
    await expect(cards(page).first()).toContainText('Uniqlo')
    await expect(cards(page).first()).toContainText('Navy · T-shirt')
    await expect(cards(page).first()).toContainText('M')
  })

  test('WRD-002, WRD-004: filtered, searched, and the filters kept', async ({ page, isMobile }) => {
    await start(page)
    await page.getByRole('searchbox', { name: 'Search clothes' }).fill('navy slim')
    await expect(cards(page)).toHaveCount(1)
    await page.getByRole('searchbox', { name: 'Search clothes' }).fill('')
    if (isMobile) await page.getByRole('button', { name: 'Filters' }).click()
    await page.getByRole('button', { name: 'Jeans' }).click()
    if (isMobile) await page.getByRole('button', { name: /^Show/ }).click()
    await expect(cards(page)).toHaveCount(1)
    await expect(cards(page)).toContainText('Navy · Jeans')
    await page.reload()
    await expect(cards(page)).toHaveCount(1)
  })

  test('WRD-003: sorted by size and grouped by category, in my order', async ({ page }) => {
    await start(page)
    await page.getByRole('combobox', { name: 'Group' }).click()
    await page.getByRole('option', { name: 'By category' }).click()
    const sections = page
      .locator('section')
      .filter({ has: page.locator('[data-slot="garment-card"]') })
    await expect(sections.first()).toContainText('T-shirt')
    await expect(sections.nth(1)).toContainText('Jeans')
    await page.getByRole('button', { name: /^Sort:/ }).click()
    await page.getByRole('menuitem', { name: 'Size' }).click()
    await page.keyboard.press('Escape')
    await expect(sections.first().locator('[data-slot="garment-card"]').first()).toContainText(
      'White · T-shirt',
    )
  })

  test('WRD-005, WRD-006, WRD-009: a photo, its colour suggested, Save, then Add another', async ({
    page,
    isMobile,
  }) => {
    await fakeCamera(page)
    const db = await start(page)
    await newGarment(page, isMobile)
    // On a computer the sheet comes first, with the camera a tap away.
    if (!isMobile) await page.getByRole('button', { name: 'Camera' }).click()
    await expect(page.getByRole('dialog', { name: 'Camera' })).toBeVisible()
    const shutter = page.getByRole('button', { name: 'Take photo' })
    await expect(shutter).toBeEnabled()
    await shutter.click()
    await page.getByRole('button', { name: 'Use photo' }).click()
    const sheet = page.getByRole('dialog', { name: 'New garment' })
    await expect(sheet).toBeVisible()
    // The navy in the photo is my Navy, chosen.
    const colour = sheet.getByRole('group', { name: 'Colour' })
    await expect(colour.getByRole('button', { name: /Navy/, pressed: true })).toBeVisible()
    await expect(sheet).toContainText('Needs a category, size and brand')
    await expect(sheet.getByRole('button', { name: 'Save' })).toBeDisabled()
    await sheet
      .getByRole('group', { name: 'Category' })
      .getByRole('button', { name: 'T-shirt' })
      .click()
    // The sizes used with T-shirts first; the rest behind More sizes.
    const size = sheet.getByRole('group', { name: 'Size' })
    await expect(size.getByRole('button', { name: '32' })).toHaveCount(0)
    await size.getByRole('button', { name: 'M', exact: true }).click()
    await sheet
      .getByRole('group', { name: 'Brand' })
      .getByRole('button', { name: 'Uniqlo' })
      .click()
    await expect(sheet).toContainText('Navy Uniqlo T-shirt')
    await sheet.getByRole('button', { name: 'Save' }).click()
    const added = page.getByRole('dialog', { name: 'Navy Uniqlo T-shirt' })
    await expect(added).toContainText('Garment · Added')
    await expect.poll(() => db.wardrobe.garment!.length).toBe(4)
    const made = db.wardrobe.garment!.at(-1)!
    expect(made).toMatchObject({
      category_id: 'c-tee',
      size_id: 's-m',
      brand_id: 'b-uniqlo',
      colour_id: 'k-navy',
    })
    // Its photo is sent once the garment has reached the server (ADR-0066 13).
    await expect.poll(() => db.attachments.some((a) => a.item_id === made.item_id)).toBe(true)

    await added.getByRole('button', { name: 'Add another' }).click()
    if (!isMobile) await page.getByRole('button', { name: 'Camera' }).click()
    await page.getByRole('button', { name: 'Take photo' }).click()
    await page.getByRole('button', { name: 'Use photo' }).click()
    const next = page.getByRole('dialog', { name: 'New garment' })
    await expect(next).toContainText('Category and size from the last one')
    await expect(
      next
        .getByRole('group', { name: 'Category' })
        .getByRole('button', { name: 'T-shirt', pressed: true }),
    ).toBeVisible()
    await expect(
      next
        .getByRole('group', { name: 'Size' })
        .getByRole('button', { name: 'M', exact: true, pressed: true }),
    ).toBeVisible()
  })

  test('WRD-006 3, WRD-007: a colour none of mine is close to is offered new, named', async ({
    page,
    isMobile,
  }) => {
    await fakeCamera(page, '#2f6f73')
    const db = await start(page)
    await newGarment(page, isMobile)
    if (!isMobile) await page.getByRole('button', { name: 'Camera' }).click()
    await page.getByRole('button', { name: 'Take photo' }).click()
    await page.getByRole('button', { name: 'Use photo' }).click()
    const sheet = page.getByRole('dialog', { name: 'New garment' })
    await expect(sheet).toContainText('None of yours is close')
    await expect(sheet.getByRole('textbox', { name: "New colour's name" })).toHaveValue('Teal')
    await sheet
      .getByRole('group', { name: 'Category' })
      .getByRole('button', { name: 'T-shirt' })
      .click()
    await sheet
      .getByRole('group', { name: 'Size' })
      .getByRole('button', { name: 'M', exact: true })
      .click()
    await sheet.getByRole('group', { name: 'Brand' }).getByRole('button', { name: 'Arket' }).click()
    await sheet.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('dialog', { name: 'Teal Arket T-shirt' })).toBeVisible()
    await expect.poll(() => db.wardrobe.colours!.find((c) => c.name === 'Teal')?.hex).toMatch(/^#/)
  })

  test('WRD-005 7, WRD-008: brand searched and made, a fit and tag inline; closing asks first', async ({
    page,
    isMobile,
  }) => {
    const db = await start(page)
    await newGarment(page, isMobile)
    if (isMobile) await page.getByRole('button', { name: 'Skip' }).click()
    const sheet = page.getByRole('dialog', { name: 'New garment' })
    await sheet
      .getByRole('group', { name: 'Colour' })
      .getByRole('button', { name: 'White' })
      .click()
    await sheet
      .getByRole('group', { name: 'Category' })
      .getByRole('button', { name: 'Jeans' })
      .click()
    await sheet.getByRole('button', { name: 'Search brands' }).click()
    await sheet.getByRole('textbox', { name: 'Search brands' }).fill('ark')
    await expect(sheet.getByRole('option', { name: 'Arket' })).toBeVisible()
    await sheet.getByRole('textbox', { name: 'Search brands' }).fill('Levi’s')
    await sheet.getByRole('button', { name: 'Add "Levi’s"' }).click()
    await expect(
      sheet
        .getByRole('group', { name: 'Brand' })
        .getByRole('button', { name: 'Levi’s', pressed: true }),
    ).toBeVisible()
    await sheet.getByRole('button', { name: 'New Fit' }).click()
    await sheet.getByRole('textbox', { name: 'New fit' }).fill('Relaxed')
    await sheet.getByRole('button', { name: 'Add fit' }).click()
    await expect(
      sheet
        .getByRole('group', { name: 'Fit' })
        .getByRole('button', { name: 'Relaxed', pressed: true }),
    ).toBeVisible()
    await expect.poll(() => db.wardrobe.brands!.some((b) => b.name === 'Levi’s')).toBe(true)
    await sheet.getByRole('button', { name: 'Cancel' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Discard' }).click()
    await expect(sheet).toBeHidden()
    expect(db.wardrobe.garment!).toHaveLength(3)
  })

  test('WRD-010, WRD-011, WRD-013: a garment opens read-only, is edited, hearted and retired', async ({
    page,
  }) => {
    const db = await start(page)
    await card(page, 'Arket', 'White', 'T-shirt').getByRole('button', { name: 'Arket' }).click()
    const popup = page.getByRole('dialog', { name: 'White Arket T-shirt' })
    await expect(popup).toContainText('Size')
    await expect(popup).toContainText('Added')
    await popup.getByRole('button', { name: 'Favourite' }).click()
    await expect.poll(() => db.marks.some((m) => m.item_id === 'g-white')).toBe(true)
    await popup.getByRole('button', { name: 'Edit' }).click()
    const sheet = page.getByRole('dialog', { name: 'Edit garment' })
    await sheet
      .getByRole('group', { name: 'Size' })
      .getByRole('button', { name: 'M', exact: true })
      .click()
    await sheet.getByRole('button', { name: 'Save' }).click()
    await expect
      .poll(() => db.wardrobe.garment!.find((x) => x.item_id === 'g-white')?.size_id)
      .toBe('s-m')
    const again = page.getByRole('dialog', { name: 'White Arket T-shirt' })
    await again.getByRole('button', { name: 'More' }).click()
    await page.getByRole('menuitem', { name: 'Retire' }).click()
    await expect(cards(page)).toHaveCount(2)
    await expect.poll(() => db.items.find((i) => i.id === 'g-white')?.status).toBe('cancelled')
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(cards(page)).toHaveCount(3)
  })

  test('WRD-012: several tagged, untagged and deleted at once', async ({ page, isMobile }) => {
    const db = await start(page)
    await select(page, isMobile)
    const toolbar = page.getByRole('toolbar', { name: 'Selection' })
    await toolbar.getByRole('button', { name: 'Select all' }).click()
    await expect(toolbar).toContainText('3 selected')
    const bar = page.getByRole('toolbar', { name: isMobile ? 'Selected' : 'Selection' })
    await bar.getByRole('button', { name: 'Add tag' }).click()
    const dialog = page.getByRole('dialog', { name: 'Add tags to 3 garments' })
    await dialog.getByRole('button', { name: 'Gym' }).click()
    await dialog.getByRole('button', { name: 'Add Gym' }).click()
    await expect.poll(() => db.wardrobe.garment_tags!.length).toBe(3)

    // A long press chooses its card; Select chooses none.
    await select(page, isMobile)
    if (!isMobile) await cards(page).first().getByRole('checkbox').click()
    await cards(page).nth(1).getByRole('checkbox').click()
    await bar.getByRole('button', { name: 'Remove tag' }).click()
    const remove = page.getByRole('dialog', { name: 'Remove tags from 2 garments' })
    await remove.getByRole('button', { name: 'Gym' }).click()
    await remove.getByRole('button', { name: 'Remove Gym' }).click()
    await expect.poll(() => db.wardrobe.garment_tags!.length).toBe(1)

    await select(page, isMobile)
    if (!isMobile) await cards(page).first().getByRole('checkbox').click()
    await bar.getByRole('button', { name: 'Delete' }).click()
    await expect(cards(page)).toHaveCount(2)
    await expect.poll(() => db.items.filter((i) => i.archived_at).length).toBe(1)
  })

  test('WRD-005 6: added without signal, kept and sent with its photo later', async ({
    page,
    isMobile,
  }) => {
    await fakeCamera(page)
    const db = await start(page)
    // The stand-in answers before the network, so its writes and uploads are refused too.
    const noSignal = (route: Parameters<Parameters<Page['route']>[1]>[0]) =>
      route.abort('internetdisconnected')
    await page.route('**/rest/v1/rpc/**', noSignal)
    await page.route('**/storage/v1/**', noSignal)
    await newGarment(page, isMobile)
    if (!isMobile) await page.getByRole('button', { name: 'Camera' }).click()
    await page.getByRole('button', { name: 'Take photo' }).click()
    await page.getByRole('button', { name: 'Use photo' }).click()
    const sheet = page.getByRole('dialog', { name: 'New garment' })
    await sheet
      .getByRole('group', { name: 'Category' })
      .getByRole('button', { name: 'Jeans' })
      .click()
    await sheet.getByRole('group', { name: 'Size' }).getByRole('button', { name: '32' }).click()
    await sheet.getByRole('group', { name: 'Brand' }).getByRole('button', { name: 'Arket' }).click()
    await sheet.getByRole('button', { name: 'Save' }).click()
    await page
      .getByRole('dialog', { name: 'Navy Arket Jeans' })
      .getByRole('button', { name: 'Done' })
      .click()
    await expect(card(page, 'Arket', 'Navy', 'Jeans')).toContainText('Not sent yet')
    expect(db.wardrobe.garment!).toHaveLength(3)
    await page.unroute('**/rest/v1/rpc/**', noSignal)
    await page.unroute('**/storage/v1/**', noSignal)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect.poll(() => db.wardrobe.garment!.length).toBe(4)
    const made = db.wardrobe.garment!.at(-1)!
    await expect.poll(() => db.attachments.some((a) => a.item_id === made.item_id)).toBe(true)
    await expect(card(page, 'Arket', 'Navy', 'Jeans')).not.toContainText('Not sent yet')
  })
})
