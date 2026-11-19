import { expect, test, type Page } from '@playwright/test'
import { itemRow, standIn, type Rows } from './stand-in'

/** A wardrobe of three garments, one retired, and an outfit in a collection. */
const SHIRT = 'g-shirt'
const CHINOS = 'g-chinos'
const OLD = 'g-old'
const OUTFIT = 'o-work'

const WARDROBE: Rows = {
  items: [
    itemRow({ id: SHIRT, type: 'garment', title: 'Sky Uniqlo shirt' }),
    itemRow({ id: CHINOS, type: 'garment', title: 'Navy Gap chinos' }),
    itemRow({
      id: OLD,
      type: 'garment',
      title: 'Navy Gap T-shirt',
      status: 'cancelled',
      updated_at: '2026-11-10T09:00:00Z',
    }),
    itemRow({ id: OUTFIT, type: 'outfit', title: 'Work' }),
  ],
  wardrobe: {
    categories: [
      { id: 'c-shirt', name: 'Shirt', position: 'a' },
      { id: 'c-trousers', name: 'Trousers', position: 'b' },
      { id: 'c-tshirt', name: 'T-shirt', position: 'c' },
    ],
    sizes: [
      { id: 's-m', name: 'M', position: 'a' },
      { id: 's-32', name: '32', position: 'b' },
    ],
    brands: [
      { id: 'b-uniqlo', name: 'Uniqlo' },
      { id: 'b-gap', name: 'Gap' },
      { id: 'b-gap2', name: 'GAP Inc' },
    ],
    fits: [{ id: 'f-slim', name: 'Slim' }],
    tags: [
      { id: 't-work', name: 'Work' },
      { id: 't-office', name: 'Office' },
    ],
    colours: [
      { id: 'col-navy', name: 'Navy', hex: '#1f2a44' },
      { id: 'col-sky', name: 'Sky', hex: '#a8c3dd' },
      { id: 'col-teal', name: 'Teal', hex: '#2f6f73' },
    ],
    collections: [{ id: 'k-lisbon', name: 'Lisbon', position: 'a' }],
    garment: [
      {
        item_id: SHIRT,
        category_id: 'c-shirt',
        size_id: 's-m',
        brand_id: 'b-uniqlo',
        colour_id: 'col-sky',
        fit_id: 'f-slim',
        own_name: null,
      },
      {
        item_id: CHINOS,
        category_id: 'c-trousers',
        size_id: 's-32',
        brand_id: 'b-gap2',
        colour_id: 'col-navy',
        fit_id: null,
        own_name: null,
      },
      {
        item_id: OLD,
        category_id: 'c-tshirt',
        size_id: 's-m',
        brand_id: 'b-gap',
        colour_id: 'col-navy',
        fit_id: null,
        own_name: null,
      },
    ],
    garment_tags: [{ garment_id: SHIRT, tag_id: 't-office' }],
    outfit_collections: [{ outfit_id: OUTFIT, collection_id: 'k-lisbon' }],
  },
  places: {
    manchester: [
      {
        id: 2643123,
        name: 'Manchester',
        latitude: 53.48095,
        longitude: -2.23743,
        admin1: 'England',
        country: 'United Kingdom',
      },
      {
        id: 5089178,
        name: 'Manchester',
        latitude: 42.99564,
        longitude: -71.45479,
        admin1: 'New Hampshire',
        country: 'United States',
      },
    ],
  },
}

async function start(page: Page, rows: Rows = WARDROBE) {
  const db = await standIn(page, { signedIn: true, rows })
  await page.goto('/settings')
  await page.getByRole('link', { name: 'Lists and weather' }).click()
  await expect(page.getByRole('heading', { name: 'Wardrobe', level: 1 })).toBeVisible()
  return db
}

const card = (page: Page, title: string) =>
  page.locator('[data-slot="card"]').filter({ has: page.getByRole('heading', { name: title }) })
/** An entry's row: its "…" menu's parent. */
const entry = (page: Page, list: string, name: string) =>
  card(page, list)
    .getByRole('button', { name: `${name} options`, exact: true })
    .locator('xpath=..')
    .locator('xpath=..')

async function choose(page: Page, list: string, name: string, action: string) {
  await card(page, list)
    .getByRole('button', { name: `${name} options`, exact: true })
    .click()
  await page.getByRole('menuitem', { name: action }).click()
}

test.describe('Settings → Wardrobe', () => {
  test('WRD-028 1: every list, each entry saying how many use it', async ({ page }) => {
    await start(page)
    for (const title of ['Categories', 'Sizes', 'Collections', 'Colours', 'Fits', 'Brands', 'Tags'])
      await expect(card(page, title)).toBeVisible()
    await expect(entry(page, 'Sizes', 'M')).toContainText('2 garments')
    await expect(entry(page, 'Categories', 'Shirt')).toContainText('1 garment')
    await expect(entry(page, 'Brands', 'Gap')).toContainText('1 garment')
    await expect(entry(page, 'Tags', 'Work')).toContainText('Unused')
    await expect(entry(page, 'Collections', 'Lisbon')).toContainText('1 outfit')
    // My Outfits is first and fixed: no menu.
    const collections = card(page, 'Collections')
    await expect(collections.getByText('My Outfits')).toBeVisible()
    await expect(collections.getByRole('button', { name: 'My Outfits options' })).toHaveCount(0)
  })

  test('WRD-028 1: every list starts empty', async ({ page }) => {
    await start(page, { items: [] })
    await expect(card(page, 'Categories')).toContainText('None yet')
    await expect(card(page, 'Colours')).toContainText('None yet')
    await expect(card(page, 'Collections')).toContainText('My Outfits')
    await expect(card(page, 'Weather')).toContainText('No place yet')
  })

  test('WRD-028 2: a new category goes last, and one already there is refused', async ({
    page,
  }) => {
    const db = await start(page)
    await page.getByRole('button', { name: 'New category' }).click()
    const name = page.getByRole('textbox', { name: 'Name' })
    await expect(name).toBeFocused()
    await name.fill('shirt')
    await expect(page.getByText('Already on the list')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()
    await name.fill('Jacket')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(card(page, 'Categories').getByText('Jacket')).toBeVisible()
    await expect
      .poll(() => {
        const rows = db.wardrobe.categories!
        const last = [...rows].sort((a, b) => (String(a.position) < String(b.position) ? -1 : 1))
        return last.at(-1)?.name
      })
      .toBe('Jacket')
  })

  test('WRD-028 2: a category dragged into place by its handle', async ({ page, isMobile }) => {
    test.skip(isMobile, 'a mouse, on a computer')
    const db = await start(page)
    const from = await page.getByLabel('Drag T-shirt to reorder').boundingBox()
    const to = await page.getByLabel('Drag Shirt to reorder').boundingBox()
    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2)
    await page.mouse.down()
    await page.mouse.move(to!.x + to!.width / 2, to!.y + 2, { steps: 8 })
    await page.mouse.up()
    const names = card(page, 'Categories').locator('[data-reorder-id]')
    await expect(names.first()).toContainText('T-shirt')
    await expect
      .poll(() => {
        const rows = [...db.wardrobe.categories!]
        rows.sort((a, b) => (String(a.position) < String(b.position) ? -1 : 1))
        return rows.map((r) => r.name).join(', ')
      })
      .toBe('T-shirt, Shirt, Trousers')
  })

  test('WRD-028 2: a size moved with the keyboard', async ({ page, isMobile }) => {
    test.skip(isMobile, 'a keyboard, on a computer')
    const db = await start(page)
    await page.getByLabel('Drag 32 to reorder').focus()
    await page.keyboard.press('Alt+ArrowUp')
    await expect(card(page, 'Sizes').locator('[data-reorder-id]').first()).toContainText('32')
    await expect
      .poll(() => {
        const rows = [...db.wardrobe.sizes!]
        rows.sort((a, b) => (String(a.position) < String(b.position) ? -1 : 1))
        return rows[0]?.name
      })
      .toBe('32')
  })

  test('WRD-028 3: a brand renamed, and merged into another', async ({ page }) => {
    const db = await start(page)
    await choose(page, 'Brands', 'Uniqlo', 'Rename')
    await page.getByRole('textbox', { name: 'Name' }).fill('UNIQLO')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(entry(page, 'Brands', 'UNIQLO')).toContainText('1 garment')
    await expect
      .poll(() => db.wardrobe.brands!.find((b) => b.id === 'b-uniqlo')?.name)
      .toBe('UNIQLO')

    await choose(page, 'Brands', 'GAP Inc', 'Merge into…')
    await expect(page.getByRole('dialog', { name: 'Merge "GAP Inc"' })).toContainText(
      '1 garment moves',
    )
    const merge = page.getByRole('button', { name: 'Merge', exact: true })
    await expect(merge).toBeDisabled()
    await page.getByRole('combobox', { name: 'Merge into' }).click()
    await page.getByRole('option', { name: 'Gap', exact: true }).click()
    await merge.click()
    await expect(page.getByText('Merged "GAP Inc" into "Gap"')).toBeVisible()
    await expect(entry(page, 'Brands', 'Gap')).toContainText('2 garments')
    await expect(card(page, 'Brands').getByText('GAP Inc')).toHaveCount(0)
    await expect
      .poll(() => db.wardrobe.garment!.find((g) => g.item_id === CHINOS)?.brand_id)
      .toBe('b-gap')
  })

  test('WRD-028 3: tags merged keep their garments', async ({ page }) => {
    const db = await start(page)
    await choose(page, 'Tags', 'Office', 'Merge into…')
    await page.getByRole('combobox', { name: 'Merge into' }).click()
    await page.getByRole('option', { name: 'Work' }).click()
    await page.getByRole('button', { name: 'Merge', exact: true }).click()
    await expect(entry(page, 'Tags', 'Work')).toContainText('1 garment')
    await expect
      .poll(() => db.wardrobe.garment_tags!.map((t) => `${t.garment_id}:${t.tag_id}`).join())
      .toBe(`${SHIRT}:t-work`)
  })

  test('WRD-028 4: a colour shows its swatch, is renamed and its swatch changed', async ({
    page,
  }) => {
    const db = await start(page)
    await expect(entry(page, 'Colours', 'Sky').locator('[data-slot="swatch"]')).toBeVisible()
    await choose(page, 'Colours', 'Sky', 'Edit')
    await page.getByRole('textbox', { name: 'Name' }).fill('Light blue')
    await page.getByLabel('Swatch').fill('#9fbfe0')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(entry(page, 'Colours', 'Light blue')).toContainText('1 garment')
    await expect
      .poll(() => db.wardrobe.colours!.find((c) => c.id === 'col-sky'))
      .toMatchObject({ name: 'Light blue', hex: '#9fbfe0' })
  })

  test('WRD-028 4: a new colour, named from its swatch', async ({ page }) => {
    const db = await start(page)
    await page.getByRole('button', { name: 'New colour' }).click()
    await page.getByLabel('Swatch').fill('#6a2334')
    await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Burgundy')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(entry(page, 'Colours', 'Burgundy')).toContainText('Unused')
    await expect
      .poll(() => db.wardrobe.colours!.find((c) => c.name === 'Burgundy')?.hex)
      .toBe('#6a2334')
  })

  test('WRD-028 4–5: a colour no garment uses is deleted, with Undo', async ({ page }) => {
    const db = await start(page)
    await choose(page, 'Colours', 'Teal', 'Delete')
    await expect(card(page, 'Colours').getByText('Teal')).toHaveCount(0)
    await expect.poll(() => db.wardrobe.colours!.some((c) => c.id === 'col-teal')).toBe(false)
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(card(page, 'Colours').getByText('Teal')).toBeVisible()
    await expect
      .poll(() => db.wardrobe.colours!.find((c) => c.id === 'col-teal')?.hex)
      .toBe('#2f6f73')
  })

  test('WRD-028 5: an entry in use isn’t deleted, and says to merge it', async ({ page }) => {
    const db = await start(page)
    await choose(page, 'Sizes', 'M', 'Delete')
    const refused = page.getByRole('alertdialog')
    await expect(refused).toContainText('"M" is in use')
    await expect(refused).toContainText('2 garments use it. Merge it into another size.')
    await refused.getByRole('button', { name: 'OK' }).click()
    await expect(card(page, 'Sizes').getByText('M', { exact: true })).toBeVisible()
    expect(db.wardrobe.sizes!.some((s) => s.id === 's-m')).toBe(true)
  })

  test('WRD-028 5: a collection can always be deleted, its outfits staying in My Outfits', async ({
    page,
  }) => {
    const db = await start(page)
    await choose(page, 'Collections', 'Lisbon', 'Delete')
    const confirm = page.getByRole('alertdialog')
    await expect(confirm).toContainText('Its outfit stays in My Outfits')
    await confirm.getByRole('button', { name: 'Delete' }).click()
    await expect(card(page, 'Collections').getByText('Lisbon')).toHaveCount(0)
    await expect(card(page, 'Collections')).toContainText('1 outfit')
    await expect.poll(() => db.wardrobe.collections!.length).toBe(0)
    await expect.poll(() => db.wardrobe.outfit_collections!.length).toBe(0)
  })

  test('WRD-028 6: the weather’s place, searched by name and chosen', async ({ page }) => {
    const db = await start(page)
    const weather = card(page, 'Weather')
    await weather.getByRole('button', { name: 'Choose' }).click()
    await page.getByRole('searchbox', { name: 'Place' }).fill('Atlantis')
    await expect(page.getByText('No place called "Atlantis"')).toBeVisible()
    await page.getByRole('searchbox', { name: 'Place' }).fill('Manchester')
    await page.getByRole('button', { name: /Manchester England, United Kingdom/ }).click()
    await expect(weather).toContainText('Manchester')
    await expect(weather).toContainText('England, United Kingdom')
    await expect(weather.getByRole('button', { name: 'Change' })).toBeVisible()
    await expect
      .poll(() => db.wardrobe.settings![0])
      .toMatchObject({
        place_name: 'Manchester, England, United Kingdom',
        latitude: 53.48095,
        longitude: -2.23743,
      })
  })

  test('WRD-028 7, WRD-013 3: retired garments, brought back or deleted', async ({ page }) => {
    const db = await start(page)
    await page.getByRole('link', { name: /Retired garments/ }).click()
    await expect(page.getByRole('heading', { name: 'Retired garments', level: 1 })).toBeVisible()
    const line = page.locator('[data-slot="garment-line"]')
    await expect(line).toHaveCount(1)
    await expect(line).toContainText('Gap')
    await expect(line).toContainText('Navy · T-shirt')
    await line.getByRole('button', { name: 'Bring back' }).click()
    await expect(page.getByText('Nothing retired')).toBeVisible()
    await expect.poll(() => db.items.find((i) => i.id === OLD)?.status).toBe('active')
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(line).toHaveCount(1)
    await expect.poll(() => db.items.find((i) => i.id === OLD)?.status).toBe('cancelled')
    await line.getByRole('button', { name: 'Delete Navy Gap T-shirt' }).click()
    await expect(page.getByText('Nothing retired')).toBeVisible()
    await expect.poll(() => db.items.find((i) => i.id === OLD)?.archived_at).not.toBeNull()
  })
})
