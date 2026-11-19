import { expect, test, type Page } from '@playwright/test'
import { itemRow, standIn, type Rows } from './stand-in'

const LISTS = {
  categories: [
    { id: 'c-tee', name: 'T-shirt', position: 'a' },
    { id: 'c-jeans', name: 'Jeans', position: 'b' },
  ],
  sizes: [
    { id: 's-m', name: 'M', position: 'a' },
    { id: 's-32', name: '32', position: 'b' },
  ],
  brands: [
    { id: 'b-uniqlo', name: 'Uniqlo' },
    { id: 'b-arket', name: 'Arket' },
  ],
  colours: [
    { id: 'k-navy', name: 'Navy', hex: '#1f2a44' },
    { id: 'k-white', name: 'White', hex: '#f3f1ec' },
  ],
  collections: [{ id: 'k-lisbon', name: 'Lisbon', position: 'a' }],
}

const garment = (id: string, title: string, row: Record<string, string>, added: string) => ({
  item: itemRow({ id, type: 'garment', title, created_at: added }),
  row: { item_id: id, fit_id: null, own_name: null, ...row },
})

const NAVY = garment(
  'g-navy',
  'Navy Uniqlo T-shirt',
  { category_id: 'c-tee', size_id: 's-m', brand_id: 'b-uniqlo', colour_id: 'k-navy' },
  '2026-11-03T09:00:00Z',
)
const WHITE = garment(
  'g-white',
  'White Arket T-shirt',
  { category_id: 'c-tee', size_id: 's-m', brand_id: 'b-arket', colour_id: 'k-white' },
  '2026-11-02T09:00:00Z',
)
const JEANS = garment(
  'g-jeans',
  'Navy Uniqlo Jeans',
  { category_id: 'c-jeans', size_id: 's-32', brand_id: 'b-uniqlo', colour_id: 'k-navy' },
  '2026-11-01T09:00:00Z',
)
const GARMENTS = [NAVY, WHITE, JEANS]

/** One outfit already, "Work": the white T-shirt and the jeans, in Lisbon. */
const WORK = 'o-work'
const ROWS: Rows = {
  items: [
    ...GARMENTS.map((g) => g.item),
    itemRow({ id: WORK, type: 'outfit', title: 'Work', created_at: '2026-11-04T09:00:00Z' }),
  ],
  links: [
    { from_item: WORK, to_item: 'g-white', link_type: 'includes' },
    { from_item: WORK, to_item: 'g-jeans', link_type: 'includes' },
  ],
  wardrobe: {
    ...LISTS,
    garment: GARMENTS.map((g) => g.row),
    outfit_collections: [{ outfit_id: WORK, collection_id: 'k-lisbon' }],
  },
}

async function start(page: Page, tab: 'wardrobe' | 'outfits' = 'wardrobe') {
  const db = await standIn(page, { signedIn: true, rows: ROWS })
  await page.goto(tab === 'outfits' ? '/wardrobe?tab=outfits' : '/wardrobe')
  await expect(page.getByRole('heading', { name: 'Wardrobe', level: 1 })).toBeVisible()
  return db
}

const garmentCards = (page: Page) => page.locator('[data-slot="garment-card"]')
const outfitCards = (page: Page) => page.locator('[data-slot="outfit-card"]')
const add = (page: Page, brand: string, colour: string, category: string) =>
  page.getByRole('checkbox', { name: `Add to the outfit: ${colour} ${brand} ${category}` })
const outfitsMade = (db: { items: Record<string, unknown>[] }) =>
  db.items.filter((i) => i.type === 'outfit' && !i.archived_at)

/** The builder: the pane on a computer, the tray opened on a phone. */
async function builder(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole('button', { name: 'Open Outfit builder' }).click()
  return page.getByRole(isMobile ? 'dialog' : 'complementary', { name: 'Outfit builder' })
}

test.describe('Outfits', () => {
  test('WRD-014: an outfit built on the Wardrobe tab, saved into a collection', async ({
    page,
    isMobile,
  }) => {
    const db = await start(page)
    await page.getByRole('button', { name: 'Build outfit' }).click()
    await add(page, 'Uniqlo', 'Navy', 'T-shirt').click()
    await add(page, 'Uniqlo', 'Navy', 'Jeans').click()
    await expect(
      page.getByRole('checkbox', { name: /Take out of the outfit: Navy Uniqlo T-shirt/ }),
    ).toBeChecked()
    const pane = await builder(page, isMobile)
    await expect(pane.locator('[data-slot="garment-line"]')).toHaveCount(2)
    await pane.getByRole('textbox', { name: 'Name' }).fill('Weekend')
    await pane
      .getByRole('group', { name: 'Collections' })
      .getByRole('button', { name: 'Lisbon' })
      .click()
    await pane.getByRole('button', { name: 'Save outfit' }).click()
    await expect(page.getByText('Outfit saved')).toBeVisible()
    await expect.poll(() => outfitsMade(db).length).toBe(2)
    const made = outfitsMade(db).find((o) => o.title === 'Weekend')!
    expect(
      db.links
        .filter((l) => l.from_item === made.id)
        .map((l) => l.to_item)
        .sort(),
    ).toEqual(['g-jeans', 'g-navy'])
    expect(db.wardrobe.outfit_collections!.some((c) => c.outfit_id === made.id)).toBe(true)
    // Clear after saving is on to start: the builder is empty again.
    const again = await builder(page, isMobile)
    await expect(again.locator('[data-slot="garment-line"]')).toHaveCount(0)
  })

  test('WRD-014 5–6: the builder is kept, and the same garments twice are refused', async ({
    page,
    isMobile,
  }) => {
    const db = await start(page)
    await page.getByRole('button', { name: 'Build outfit' }).click()
    await add(page, 'Arket', 'White', 'T-shirt').click()
    await add(page, 'Uniqlo', 'Navy', 'Jeans').click()
    await page.reload()
    await page.getByRole('button', { name: 'Build outfit' }).click()
    const pane = await builder(page, isMobile)
    await expect(pane.locator('[data-slot="garment-line"]')).toHaveCount(2)
    await pane.getByRole('button', { name: 'Save outfit' }).click()
    await expect(page.getByText('Already an outfit: Work')).toBeVisible()
    expect(outfitsMade(db)).toHaveLength(1)
  })

  test('WRD-015, WRD-016: New outfit from the Outfits tab, by collection', async ({ page }) => {
    const db = await start(page, 'outfits')
    await expect(outfitCards(page)).toHaveCount(1)
    await expect(outfitCards(page)).toContainText('Work')
    await page.getByRole('button', { name: 'New outfit' }).filter({ visible: true }).first().click()
    const editor = page.getByRole('dialog', { name: 'New outfit' })
    await editor
      .getByRole('group', { name: 'Category' })
      .getByRole('button', { name: 'T-shirt' })
      .click()
    await expect(editor.locator('[data-slot="garment-card"]')).toHaveCount(2)
    await add(editor as unknown as Page, 'Uniqlo', 'Navy', 'T-shirt').click()
    await editor
      .getByRole('group', { name: 'Category' })
      .getByRole('button', { name: 'T-shirt' })
      .click()
    await add(editor as unknown as Page, 'Uniqlo', 'Navy', 'Jeans').click()
    await expect(editor).toContainText('2 garments')
    await editor.getByRole('button', { name: 'Save outfit' }).click()
    await expect(page.getByRole('dialog', { name: 'Untitled outfit' })).toBeVisible()
    await expect.poll(() => outfitsMade(db).length).toBe(2)
    await page.keyboard.press('Escape')
    await expect(outfitCards(page)).toHaveCount(2)
    await page.getByRole('combobox', { name: 'Collection' }).click()
    await page.getByRole('option', { name: 'Lisbon' }).click()
    await expect(outfitCards(page)).toHaveCount(1)
    await page.getByRole('searchbox', { name: 'Search outfits' }).fill('navy uniqlo')
    await expect(outfitCards(page)).toHaveCount(1)
    await page.getByRole('searchbox', { name: 'Search outfits' }).fill('arket white')
    await expect(outfitCards(page)).toHaveCount(1)
  })

  test('WRD-017, WRD-021: an outfit opened, edited, planned, and removed from its collection', async ({
    page,
    isMobile,
  }) => {
    const db = await start(page, 'outfits')
    await outfitCards(page).getByRole('button', { name: 'Work' }).click()
    const popup = page.getByRole('dialog', { name: 'Work' })
    await expect(popup.locator('[data-slot="garment-line"]')).toHaveCount(2)
    await expect(popup).toContainText('Lisbon')
    await popup.getByRole('button', { name: 'Edit' }).click()
    const editor = page.getByRole('dialog', { name: 'Edit outfit' })
    await add(editor as unknown as Page, 'Uniqlo', 'Navy', 'T-shirt').click()
    await editor.getByRole('textbox', { name: 'Name' }).fill('Office')
    await editor.getByRole('button', { name: 'Save outfit' }).click()
    await expect.poll(() => db.items.find((i) => i.id === WORK)?.title).toBe('Office')
    await expect.poll(() => db.links.filter((l) => l.from_item === WORK).length).toBe(3)
    const office = page.getByRole('dialog', { name: 'Office' })
    await office.getByRole('button', { name: 'Add to Planned outfits' }).click()
    await expect.poll(() => db.wardrobe.planned_outfits!.length).toBe(1)
    await expect(office.getByRole('button', { name: 'In Planned outfits' })).toBeDisabled()
    await page.keyboard.press('Escape')
    const pane = isMobile
      ? (await page.getByRole('button', { name: 'Open Planned outfits' }).click(),
        page.getByRole('dialog', { name: 'Planned outfits' }))
      : page.getByRole('complementary', { name: 'Planned outfits' })
    await expect(pane.locator('[data-slot="planned-outfit"]')).toContainText('Office')
    await pane.getByRole('button', { name: 'Remove Office from Planned outfits' }).click()
    await expect.poll(() => db.wardrobe.planned_outfits!.length).toBe(0)
    if (isMobile) await pane.getByRole('button', { name: 'Close Planned outfits' }).click()

    // In my own collection, Remove from it and no Delete (WRD-017 4).
    await page.getByRole('combobox', { name: 'Collection' }).click()
    await page.getByRole('option', { name: 'Lisbon' }).click()
    await outfitCards(page).getByRole('button', { name: 'Office' }).click()
    await page.getByRole('dialog', { name: 'Office' }).getByRole('button', { name: 'More' }).click()
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toHaveCount(0)
    await page.getByRole('menuitem', { name: 'Remove from Lisbon' }).click()
    await expect(outfitCards(page)).toHaveCount(0)
    await expect.poll(() => db.wardrobe.outfit_collections!.length).toBe(0)
    expect(db.items.find((i) => i.id === WORK)?.archived_at).toBeNull()
  })

  test('WRD-019: several outfits planned, filed and deleted at once', async ({
    page,
    isMobile,
  }) => {
    const rows = structuredClone(ROWS)
    rows.items!.push(itemRow({ id: 'o-gym', type: 'outfit', title: 'Gym' }))
    rows.links!.push({ from_item: 'o-gym', to_item: 'g-navy', link_type: 'includes' })
    const db = await standIn(page, { signedIn: true, rows })
    await page.goto('/wardrobe?tab=outfits')
    if (isMobile) {
      const first = outfitCards(page).first()
      await first.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true })
      await page.waitForTimeout(700)
      await first.dispatchEvent('pointerup', { pointerType: 'touch', isPrimary: true })
    } else await page.getByRole('button', { name: 'Select' }).click()
    await page
      .getByRole('toolbar', { name: 'Selection' })
      .getByRole('button', { name: 'Select all' })
      .click()
    const bar = page.getByRole('toolbar', { name: isMobile ? 'Selected' : 'Selection' })
    await bar.getByRole('button', { name: 'Add to collection' }).click()
    const collect = page.getByRole('dialog', { name: 'Add 2 outfits to a collection' })
    await collect.getByRole('button', { name: 'Lisbon' }).click()
    await collect.getByRole('button', { name: 'Add', exact: true }).click()
    await expect.poll(() => db.wardrobe.outfit_collections!.length).toBe(2)

    if (isMobile) {
      const first = outfitCards(page).first()
      await first.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true })
      await page.waitForTimeout(700)
      await first.dispatchEvent('pointerup', { pointerType: 'touch', isPrimary: true })
    } else await page.getByRole('button', { name: 'Select' }).click()
    await page
      .getByRole('toolbar', { name: 'Selection' })
      .getByRole('button', { name: 'Select all' })
      .click()
    await bar.getByRole('button', { name: 'Add to Planned outfits' }).click()
    await expect.poll(() => db.wardrobe.planned_outfits!.length).toBe(2)

    if (isMobile) {
      const first = outfitCards(page).first()
      await first.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true })
      await page.waitForTimeout(700)
      await first.dispatchEvent('pointerup', { pointerType: 'touch', isPrimary: true })
    } else {
      await page.getByRole('button', { name: 'Select' }).click()
      await outfitCards(page).first().getByRole('checkbox').click()
    }
    await bar.getByRole('button', { name: 'Delete' }).click()
    await expect(outfitCards(page)).toHaveCount(1)
    await expect.poll(() => outfitsMade(db).length).toBe(1)
    // The garments stay (WRD-019 2).
    expect(db.items.filter((i) => i.type === 'garment' && !i.archived_at)).toHaveLength(3)
    await page
      .getByRole('listitem')
      .filter({ hasText: /^Deleted/ })
      .getByRole('button', { name: 'Undo' })
      .click()
    await expect(outfitCards(page)).toHaveCount(2)
  })

  test('WRD-010 1: a garment shows the outfits it is in, each opening', async ({ page }) => {
    await start(page)
    await garmentCards(page)
      .filter({ hasText: 'Arket' })
      .getByRole('button', { name: 'Arket' })
      .click()
    const popup = page.getByRole('dialog', { name: 'White Arket T-shirt' })
    await expect(popup).toContainText('In outfits')
    await popup.getByRole('button', { name: 'Work' }).click()
    await expect(page.getByRole('dialog', { name: 'Work' })).toBeVisible()
  })
})
