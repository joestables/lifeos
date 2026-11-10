import { expect, test, type Locator, type Page, type Route } from '@playwright/test'
import { DISHOOM, KATSU_MEAL, NOW, mealCards, mealRows } from './meal-rows'
import { CHICKEN, PANKO, id } from './recipe-rows'
import { ANN, itemRow, standIn, type Rows } from './stand-in'

const SHOP = id(80)
const LIST = id(81)
const MILK = id(82)
const SALT = id(83)

/** The Meals' rows with a shop holding Katsu curry, a Pantry with milk and salt, and a list. */
function shopRows(): Rows {
  const base = mealRows()
  return {
    ...base,
    items: [
      ...(base.items ?? []),
      itemRow({ id: SHOP, type: 'shopping_list', title: 'Big shop', do_on: '2026-10-17' }),
      itemRow({ id: LIST, type: 'shopping_list', title: 'Screwfix' }),
    ],
    shopping_list: [
      { item_id: SHOP, kind: 'food' },
      { item_id: LIST, kind: 'list' },
    ],
    list_meals: [{ list_id: SHOP, meal_id: KATSU_MEAL }],
    pantry: [
      ...(base.pantry ?? []),
      {
        id: MILK,
        name: 'Milk',
        kind: 'ingredient',
        aisle: 'chilled',
        default_unit: null,
        added_by: ANN.id,
      },
      {
        id: SALT,
        name: 'Salt',
        kind: 'ingredient',
        aisle: 'cupboard',
        default_unit: 'g',
        added_by: ANN.id,
      },
    ],
    space_entries: [
      { space_id: 's', pantry_id: SALT, kind: 'staple', needed: true },
      { space_id: 's', pantry_id: MILK, kind: 'essential', needed: true },
      { space_id: 's', pantry_id: PANKO, kind: 'staple', needed: false },
    ],
  }
}

async function start(page: Page, path = '/shopping', rows: Rows = shopRows()) {
  await page.clock.setFixedTime(NOW)
  const db = await standIn(page, { signedIn: true, rows })
  await page.goto(path)
  return db
}

const aisle = (page: Page, name: string) => page.getByRole('group', { name, exact: true })
const line = (page: Page | Locator, name: string) =>
  page.locator('[data-slot="shopping-line"]').filter({ hasText: name })

test.describe('Shopping', () => {
  test('SHP-001 1, 2; SHP-002 1, 2: a new shop of the plan’s Meals, by aisle', async ({
    page,
    isMobile,
  }) => {
    const db = await start(page, '/today', mealRows())
    if (isMobile) await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('link', { name: 'Shopping' }).click()
    await expect(page.getByRole('heading', { name: 'Shopping', level: 1 })).toBeVisible()
    await expect(page.getByText('No shops')).toBeVisible()
    await page.getByRole('button', { name: 'New shop' }).first().click()
    const dialog = page.getByRole('dialog', { name: 'New shop' })
    await dialog.getByLabel('Name').fill('Big shop')
    // Katsu curry tonight and Out: Dishoom on Saturday, both ticked to start.
    await expect(dialog.getByRole('checkbox', { checked: true })).toHaveCount(2)
    await dialog.getByRole('button', { name: 'Create' }).click()

    await expect(page.getByRole('heading', { name: 'Big shop', level: 1 })).toBeVisible()
    await expect.poll(() => db.shopping_list.length).toBe(1)
    expect(db.items.find((i) => i.type === 'shopping_list')).toMatchObject({ do_on: '2026-10-15' })
    // No Meals named under a line (Joe, 25 October).
    await expect(line(aisle(page, 'Protein'), 'Chicken thighs')).toContainText('4')
    await expect(line(aisle(page, 'Protein'), 'Chicken thighs')).not.toContainText('Katsu')
    await expect(line(aisle(page, 'Cupboard'), 'Panko breadcrumbs')).toContainText('100 g')
  })

  test('SHP-002 4: an eaten Meal isn’t offered for a new shop (Joe, 26 October)', async ({
    page,
  }) => {
    const base = mealRows()
    await start(page, '/shopping', {
      ...base,
      items: (base.items ?? []).map((i) => (i.id === DISHOOM ? { ...i, status: 'done' } : i)),
    })
    await page.getByRole('button', { name: 'New shop' }).first().click()
    const dialog = page.getByRole('dialog', { name: 'New shop' })
    await expect(dialog.getByText('Katsu curry')).toBeVisible()
    await expect(dialog.getByText('Out: Dishoom')).toHaveCount(0)
  })

  test('SHP-003 1, 2: added from the Pantry or typed, joining the Meal’s total', async ({
    page,
  }) => {
    const db = await start(page, `/shopping/${SHOP}`)
    const add = page.getByRole('textbox', { name: 'Add to the shop' })
    await add.fill('2 chick')
    // Enter takes the highlighted match, once the Pantry has loaded.
    await expect(
      page.getByRole('listbox', { name: 'Pantry' }).getByRole('option', { name: /Chicken thighs/ }),
    ).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(line(aisle(page, 'Protein'), 'Chicken thighs')).toContainText('6')
    await add.fill('Sourdough')
    await expect(page.getByText('Add "Sourdough" as typed')).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(line(aisle(page, 'Other'), 'Sourdough')).toBeVisible()
    await expect
      .poll(() => db.lines.filter((l) => !l.meal_id).map((l) => l.pantry_id ?? l.text))
      .toEqual([CHICKEN, 'Sourdough'])
    // A line I added comes off with its ×, no asking (Joe, 25 October).
    await line(aisle(page, 'Other'), 'Sourdough')
      .getByRole('button', { name: 'Remove Sourdough' })
      .click()
    await expect(line(page, 'Sourdough')).toHaveCount(0)
    await expect.poll(() => db.lines.some((l) => l.text === 'Sourdough')).toBe(false)
    // A Meal's line has no menu: it changes with its Meal.
    await page.getByRole('tab', { name: /Meals/ }).click()
    await expect(
      page.getByRole('group', { name: 'Katsu curry' }).getByRole('button', { name: 'More' }),
    ).toHaveCount(1)
  })

  test('SHP-003 3, 4: what’s needed is on the shop by itself; Extra adds and takes off', async ({
    page,
    isMobile,
  }) => {
    const db = await start(page, `/shopping/${SHOP}`)
    // Salt is out of stock and milk Required, at home: on All by themselves.
    await expect(line(aisle(page, 'Cupboard'), 'Salt')).toBeVisible()
    await expect(line(aisle(page, 'Chilled'), 'Milk')).toBeVisible()
    // Panko is a staple the Meal uses: not on All, but offered on Extra.
    await expect(line(page, 'Panko')).toHaveCount(0)
    await page.getByRole('tab', { name: /Extra/ }).click()
    const added = aisle(page, 'Added')
    const staples = aisle(page, 'Add staples')
    const essentials = aisle(page, 'Add essentials')
    await expect(line(added, 'Salt')).toContainText('Out of stock')
    await expect(line(added, 'Milk')).toContainText('Required')
    // What I added first on a phone; beside the offers on a computer.
    const a = (await added.boundingBox())!
    const st = (await staples.boundingBox())!
    if (isMobile) expect(a.y).toBeLessThan(st.y)
    else expect(a.x).toBeGreaterThan(st.x)
    // Only what's on the shop is Added, not a Meal's line (the Onion bug).
    await expect(staples.getByRole('button', { name: 'Take Salt off' })).toBeVisible()
    await expect(essentials.getByRole('button', { name: 'Take Milk off' })).toBeVisible()
    await staples.getByRole('button', { name: 'Add Panko breadcrumbs' }).click()
    await expect.poll(() => db.space_entries.find((e) => e.pantry_id === PANKO)?.needed).toBe(true)
    await expect(line(added, 'Panko breadcrumbs')).toContainText('Out of stock')
    // Its × unmarks salt: off every shop.
    await line(added, 'Salt').getByRole('button', { name: 'Remove Salt' }).click()
    await expect.poll(() => db.space_entries.find((e) => e.pantry_id === SALT)?.needed).toBe(false)
    await expect(line(added, 'Salt')).toHaveCount(0)
    // In stock and in no Meal here, it isn't offered.
    await expect(staples.getByText('Salt')).toHaveCount(0)
    // Ticked, milk is stored, ticked, and no longer Required (SHP-003 4).
    await line(added, 'Milk').getByRole('checkbox').click()
    await expect
      .poll(() => db.lines.find((l) => l.pantry_id === MILK))
      .toMatchObject({ checked: true, needed_space_id: 's' })
    await expect.poll(() => db.space_entries.find((e) => e.pantry_id === MILK)?.needed).toBe(false)
    await expect(line(added, 'Milk').getByRole('checkbox')).toBeChecked()
  })

  test('SHP-002 3: a shop counts as All does', async ({ page }) => {
    await start(page)
    // Chicken, honey, salt and milk; panko (a staple) is checked on Extra.
    await expect(
      page.locator('[data-slot="item-row"]').filter({ hasText: 'Big shop' }),
    ).toContainText('0 of 4')
  })

  test('SHP-001 4, 5: ticked to the last line, Done; done shops a press away', async ({ page }) => {
    const db = await start(page, `/shopping/${SHOP}`)
    await line(page, 'Chicken thighs').getByRole('checkbox').click()
    await expect(line(aisle(page, 'Protein'), 'Chicken thighs').getByRole('checkbox')).toBeChecked()
    await line(page, 'Salt').getByRole('checkbox').click()
    await line(page, 'Milk').getByRole('checkbox').click()
    // Panko, a staple, is checked on Extra: the last line is Honey.
    await line(page, 'Honey').getByRole('checkbox').click()
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByRole('heading', { name: 'Shopping', level: 1 })).toBeVisible()
    await expect.poll(() => db.items.find((i) => i.id === SHOP)?.status).toBe('done')
    await page.getByRole('button', { name: 'Done shops' }).click()
    await expect(
      page.locator('[data-slot="item-row"]').filter({ hasText: 'Big shop' }),
    ).toBeVisible()
  })

  test('SHP-001 5: Complete list asks first while lines are unticked', async ({ page }) => {
    const db = await start(page, `/shopping/${SHOP}`)
    await page.getByRole('button', { name: 'More' }).first().click()
    await page.getByRole('menuitem', { name: 'Complete list' }).click()
    const ask = page.getByRole('alertdialog')
    await expect(ask).toContainText("lines aren't ticked")
    await ask.getByRole('button', { name: 'Complete' }).click()
    await expect.poll(() => db.items.find((i) => i.id === SHOP)?.status).toBe('done')
  })

  test('SHP-001 5: Complete list from a shop’s row, asking first; Other has no done lists', async ({
    page,
  }) => {
    const db = await start(page)
    await page
      .locator('[data-slot="item-row"]')
      .filter({ hasText: 'Big shop' })
      .getByRole('button', { name: 'More' })
      .click()
    await page.getByRole('menuitem', { name: 'Complete list' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Complete' }).click()
    await expect.poll(() => db.items.find((i) => i.id === SHOP)?.status).toBe('done')
    // The Lists tab is Other now, and keeps no done lists (Joe, 26 October).
    await page.getByRole('tab', { name: 'Other' }).click()
    await expect(page.getByText('Screwfix')).toBeVisible()
    await expect(page.getByRole('button', { name: /Done lists/ })).toHaveCount(0)
  })

  test('SHP-001 4: a ticked line stays where it is', async ({ page }) => {
    await start(page, `/shopping/${SHOP}`)
    const names = page.locator('[data-slot="shopping-line"] span.font-semibold')
    await expect(line(page, 'Chicken thighs')).toBeVisible()
    const before = await names.allTextContents()
    await line(page, before[0]!).getByRole('checkbox').click()
    await expect(line(page, before[0]!).getByRole('checkbox')).toBeChecked()
    expect(await names.allTextContents()).toEqual(before)
  })

  test('Edit details opens without the keyboard; New list opens on its name', async ({ page }) => {
    await start(page, `/shopping/${SHOP}`)
    await page.getByRole('button', { name: 'More' }).first().click()
    await page.getByRole('menuitem', { name: 'Edit details…' }).click()
    await expect(page.getByRole('dialog', { name: 'Shop details' })).toBeVisible()
    await expect(page.getByLabel('Name')).not.toBeFocused()
    await page.keyboard.press('Escape')
    await page.goto('/shopping?tab=lists')
    await page.getByRole('button', { name: 'New list' }).first().click()
    await expect(page.getByRole('dialog', { name: 'New list' }).getByLabel('Name')).toBeFocused()
  })

  test('SHP-005: staples and Essentials kept in the Pantry, out of stock and Required', async ({
    page,
  }) => {
    const db = await start(page, '/meal-plan?tab=pantry')
    const row = (name: string) => page.locator('[data-slot="pantry-row"]').filter({ hasText: name })
    await expect(row('Salt').getByRole('button', { name: 'Salt out of stock' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    // A staple at a press, then out of stock.
    await row('Chicken thighs').getByRole('button', { name: 'Staple: Chicken thighs' }).click()
    await expect
      .poll(() => db.space_entries.find((e) => e.pantry_id === CHICKEN))
      .toMatchObject({ kind: 'staple', needed: false })
    await row('Chicken thighs').getByRole('button', { name: 'Chicken thighs out of stock' }).click()
    await expect
      .poll(() => db.space_entries.find((e) => e.pantry_id === CHICKEN)?.needed)
      .toBe(true)
    // Made an Essential instead: one or the other.
    await row('Chicken thighs').getByRole('button', { name: 'Essential: Chicken thighs' }).click()
    await expect
      .poll(() => db.space_entries.find((e) => e.pantry_id === CHICKEN)?.kind)
      .toBe('essential')
    await expect(
      row('Chicken thighs').getByRole('button', { name: 'Staple: Chicken thighs' }),
    ).toHaveAttribute('aria-pressed', 'false')
    // Essentials only; one taken off leaves, with Undo.
    await page
      .getByRole('group', { name: 'Show' })
      .getByRole('button', { name: 'Essentials' })
      .click()
    await expect(page.locator('[data-slot="pantry-row"]')).toHaveCount(2)
    await expect(row('Milk').getByRole('button', { name: 'Milk required' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await row('Milk').getByRole('button', { name: 'Essential: Milk' }).click()
    await expect.poll(() => db.space_entries.some((e) => e.pantry_id === MILK)).toBe(false)
    await expect(row('Milk')).toHaveCount(0)
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect
      .poll(() => db.space_entries.find((e) => e.pantry_id === MILK))
      .toMatchObject({ kind: 'essential', needed: true })
    // Shopping → Food holds only the shops now.
    await page.goto('/shopping')
    await expect(page.getByText('Big shop')).toBeVisible()
    await expect(page.getByRole('group', { name: 'Staples' })).toHaveCount(0)
  })

  test('SHP-001 3: a list by my own subheadings, ticked as I go', async ({ page }) => {
    const db = await start(page, '/shopping?tab=lists')
    await page.getByText('Screwfix').click()
    await expect(page.getByRole('heading', { name: 'Screwfix', level: 1 })).toBeVisible()
    await page.getByRole('textbox', { name: 'Add a subheading' }).fill('Bathroom')
    await page.keyboard.press('Enter')
    const bathroom = aisle(page, 'Bathroom')
    await bathroom.getByRole('textbox', { name: 'Add to Bathroom' }).fill('Silicone sealant')
    await page.keyboard.press('Enter')
    await line(bathroom, 'Silicone sealant').getByRole('checkbox').click()
    await expect
      .poll(() => db.lines.find((l) => l.text === 'Silicone sealant'))
      .toMatchObject({ list_id: LIST, checked: true })
    expect(db.lines.find((l) => l.heading === 'Bathroom')).toBeTruthy()
  })

  test('ITM-006 3: a shop deleted, with Undo', async ({ page }) => {
    const db = await start(page)
    await page
      .locator('[data-slot="item-row"]')
      .filter({ hasText: 'Big shop' })
      .getByRole('button', { name: 'More' })
      .click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await expect.poll(() => db.items.find((i) => i.id === SHOP)?.archived_at).toBeTruthy()
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect.poll(() => db.items.find((i) => i.id === SHOP)?.archived_at).toBeNull()
  })

  test('PLN-008 2, 4: a dated shop on Plan, and a new one from a day’s "+"', async ({
    page,
    isMobile,
  }) => {
    const db = await start(page, '/week?day=2026-10-17')
    const card = page.locator('[data-slot="plan-card"]').filter({ hasText: 'Big shop' })
    await expect(card).toBeVisible()
    await page.goto('/week?day=2026-10-16')
    if (isMobile) await page.getByRole('button', { name: 'Add' }).last().click()
    else await page.getByRole('button', { name: /^Add to .*16/ }).click()
    await page.getByRole('menuitem', { name: 'Shopping list' }).click()
    const dialog = page.getByRole('dialog', { name: 'New shop' })
    await dialog.getByLabel('Name').fill('Top-up')
    await dialog.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByRole('heading', { name: 'Top-up', level: 1 })).toBeVisible()
    await expect.poll(() => db.items.find((i) => i.title === 'Top-up')?.do_on).toBe('2026-10-16')
  })

  test('SRC-003 2: Search finds a list by name or by a line on it', async ({ page, isMobile }) => {
    await start(page, '/today')
    if (isMobile) await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    const input = page.getByRole('combobox', { name: 'Search' })
    const list = page.getByRole('listbox', { name: 'Search' })
    await input.fill('screwfix')
    await expect(list.getByRole('option', { name: /Screwfix/ })).toBeVisible()
    await input.fill('chicken')
    await list.getByRole('option', { name: /Big shop/ }).click()
    await expect(page.getByRole('heading', { name: 'Big shop', level: 1 })).toBeVisible()
  })

  test('SHP-002 1: Meals chosen on the Meal plan made a shop', async ({ page }) => {
    const db = await start(page, '/meal-plan?day=2026-10-15', mealRows())
    await page.getByRole('button', { name: 'Select' }).click()
    // Leftovers have no lines of their own: not offered.
    await expect(page.getByRole('checkbox', { name: /Leftovers/ })).toHaveCount(0)
    await page.getByRole('checkbox', { name: 'Out: Dishoom' }).click()
    await page.getByRole('checkbox', { name: 'Katsu curry' }).click()
    await expect(page.getByText('2 selected')).toBeVisible()
    await page.getByRole('button', { name: 'Add to shop' }).filter({ visible: true }).click()
    await expect(page.getByRole('heading', { name: 'Food shop', level: 1 })).toBeVisible()
    await expect.poll(() => db.list_meals.length).toBe(2)
    expect(db.items.find((i) => i.type === 'shopping_list')).toMatchObject({ do_on: '2026-10-15' })
    await expect(line(page, 'Chicken thighs')).toContainText('4')
  })

  test('SHP-002 4; MPL-003 4: a Meal on a shop isn’t chosen again, and rescaled, the shop follows', async ({
    page,
  }) => {
    const db = await start(page, '/meal-plan?day=2026-10-15')
    await page.getByRole('button', { name: 'Select' }).click()
    await expect(page.getByRole('checkbox', { name: 'Katsu curry' })).toHaveCount(0)
    // Faded, saying why (Joe, 26 October).
    await expect(mealCards(page, '2026-10-15:dinner')).toContainText('On Big shop')
    await page.getByRole('button', { name: 'Stop selecting' }).click()
    // Thursday's dinner, not Friday's leftovers of it.
    await mealCards(page, '2026-10-15:dinner').getByRole('button', { name: 'Katsu curry' }).click()
    const dialog = page.getByRole('dialog', { name: 'Katsu curry' })
    await dialog.getByLabel('Servings').fill('8')
    await dialog.getByLabel('Servings').blur()
    await expect.poll(() => db.meal.find((m) => m.item_id === KATSU_MEAL)?.servings).toBe(8)
    await page.goto(`/shopping/${SHOP}`)
    await expect(line(page, 'Chicken thighs')).toContainText('8')
  })

  test('SHP-002 4, 5: a Meal taken off the shop, its lines going, and added back', async ({
    page,
  }) => {
    const db = await start(page, `/shopping/${SHOP}`)
    await page.getByRole('tab', { name: /Meals/ }).click()
    await page
      .getByRole('group', { name: 'Katsu curry' })
      .getByRole('button', { name: 'More' })
      .click()
    await page.getByRole('menuitem', { name: 'Take off the shop' }).click()
    await expect.poll(() => db.list_meals.length).toBe(0)
    await expect.poll(() => db.lines.filter((l) => l.meal_id).length).toBe(0)
    await page.getByRole('button', { name: 'Add a meal' }).click()
    const dialog = page.getByRole('dialog', { name: 'Add a meal' })
    await dialog.getByText('Katsu curry').click()
    await dialog.getByRole('button', { name: 'Add' }).click()
    await expect(page.getByRole('group', { name: 'Katsu curry' })).toContainText('Chicken thighs')
    await expect.poll(() => db.list_meals.map((m) => m.meal_id)).toEqual([KATSU_MEAL])
  })

  test('SHP-004 2: panko marked out of stock on another phone comes onto the open shop', async ({
    page,
  }) => {
    const db = await start(page, `/shopping/${SHOP}`)
    await expect(line(page, 'Chicken thighs')).toBeVisible()
    await expect(line(page, 'Panko')).toHaveCount(0)
    await expect.poll(() => db.live.joined()).toBeGreaterThan(0)
    const panko = db.space_entries.find((e) => e.pantry_id === PANKO)!
    panko.needed = true
    db.live.change('space_entries', 'UPDATE', panko, 'food')
    await expect(line(aisle(page, 'Cupboard'), 'Panko breadcrumbs')).toBeVisible({ timeout: 2000 })
  })

  test('SHP-004 2: what the other ticks, adds and deletes shows within a second or two', async ({
    page,
  }) => {
    const db = await start(page, `/shopping/${SHOP}`)
    await expect(line(page, 'Chicken thighs')).toBeVisible()
    await expect.poll(() => db.live.joined()).toBeGreaterThan(0)
    // Ben ticks the chicken in Tesco.
    const chicken = db.lines.find((l) => l.pantry_id === CHICKEN)!
    chicken.checked = true
    db.live.change('lines', 'UPDATE', chicken)
    await expect(line(page, 'Chicken thighs').getByRole('checkbox')).toBeChecked({ timeout: 2000 })
    // Then adds bread, and takes it off again.
    const bread = {
      ...chicken,
      id: id(90),
      meal_id: null,
      source_id: null,
      pantry_id: null,
      text: 'Bread',
      checked: false,
    }
    db.lines.push(bread)
    db.live.change('lines', 'INSERT', bread)
    await expect(line(page, 'Bread')).toBeVisible({ timeout: 2000 })
    db.lines.splice(db.lines.indexOf(bread), 1)
    db.live.change('lines', 'DELETE', { id: bread.id })
    await expect(line(page, 'Bread')).toHaveCount(0, { timeout: 2000 })
  })

  test('SHP-004 3: ticked with no signal, kept and sent when it returns', async ({
    page,
    context,
  }) => {
    const db = await start(page, `/shopping/${SHOP}`)
    await expect(line(page, 'Honey')).toBeVisible()
    // The stand-in answers before the network, so its writes are refused too.
    const noSignal = (route: Route) => route.abort('internetdisconnected')
    await page.route('**/rest/v1/rpc/**', noSignal)
    await context.setOffline(true)
    await line(page, 'Honey').getByRole('checkbox').click()
    await expect(line(page, 'Honey').getByRole('checkbox')).toBeChecked()
    expect(db.lines.find((l) => l.text === 'Honey')?.checked).toBe(false)
    await page.unroute('**/rest/v1/rpc/**', noSignal)
    await context.setOffline(false)
    await expect.poll(() => db.lines.find((l) => l.text === 'Honey')?.checked).toBe(true)
  })

  test('SHP-004 3: a Meal added and its line ticked with no signal, both sent when it returns', async ({
    page,
    context,
  }) => {
    const db = await start(page, `/shopping/${SHOP}`, { ...shopRows(), list_meals: [] })
    await expect(page.getByRole('heading', { name: 'Big shop', level: 1 })).toBeVisible()
    const noSignal = (route: Route) => route.abort('internetdisconnected')
    await page.route('**/rest/v1/rpc/**', noSignal)
    await context.setOffline(true)
    await page.getByRole('tab', { name: /Meals/ }).click()
    await page.getByRole('button', { name: 'Add a meal' }).click()
    const dialog = page.getByRole('dialog', { name: 'Add a meal' })
    await dialog.getByText('Katsu curry').click()
    await dialog.getByRole('button', { name: 'Add' }).click()
    await page.getByRole('tab', { name: /All/ }).click()
    await line(page, 'Chicken thighs').getByRole('checkbox').click()
    await expect(line(page, 'Chicken thighs').getByRole('checkbox')).toBeChecked()
    await page.unroute('**/rest/v1/rpc/**', noSignal)
    await context.setOffline(false)
    // The line the server writes is the one ticked (Joe, 26 October).
    await expect
      .poll(
        () => db.lines.find((l) => l.meal_id === KATSU_MEAL && l.pantry_id === CHICKEN)?.checked,
      )
      .toBe(true)
  })

  test('ITM-006 5; SHP-003 5: a Thought naming a Pantry ingredient sorted into a food shop', async ({
    page,
  }) => {
    const base = mealRows()
    const thought = id(91)
    const db = await start(page, '/notes?tab=thoughts', {
      ...base,
      items: [
        ...(base.items ?? []),
        itemRow({ id: thought, type: 'thought', title: 'buy milk, bread and 2 chicken thighs' }),
        itemRow({ id: id(92), type: 'thought', title: 'call mum' }),
      ],
      pantry: [
        ...(base.pantry ?? []),
        {
          id: MILK,
          name: 'Milk',
          kind: 'ingredient',
          aisle: 'chilled',
          default_unit: null,
          added_by: ANN.id,
        },
      ],
    })
    const row = (title: string) => page.locator('[data-slot="item-row"]').filter({ hasText: title })
    // Not food: Shopping list isn't offered.
    await row('call mum').getByRole('button', { name: 'More' }).click()
    await expect(page.getByRole('menuitem', { name: 'Task' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Shopping list' })).toHaveCount(0)
    await page.keyboard.press('Escape')
    // With no open shop, it becomes one at once.
    await row('buy milk').getByRole('button', { name: 'More' }).click()
    await page.getByRole('menuitem', { name: 'Shopping list' }).click()
    const toast = page
      .locator('[data-sonner-toast]')
      .filter({ hasText: 'Converted into a Shopping list' })
    await toast.getByRole('button', { name: 'Open' }).click()
    await expect(page.getByRole('heading', { name: 'Food shop', level: 1 })).toBeVisible()
    await expect(line(aisle(page, 'Chilled'), 'Milk')).toBeVisible()
    await expect(line(aisle(page, 'Other'), 'Bread')).toBeVisible()
    await expect(line(aisle(page, 'Protein'), 'Chicken thighs')).toContainText('2')
    await expect
      .poll(() => db.items.find((i) => i.id === thought))
      .toMatchObject({ type: 'shopping_list', title: 'Food shop' })
  })

  test('SHP-003 5: a Thought’s lines added to an open shop instead', async ({ page }) => {
    const base = shopRows()
    const thought = id(93)
    const db = await start(page, '/notes?tab=thoughts', {
      ...base,
      items: [...(base.items ?? []), itemRow({ id: thought, type: 'thought', title: 'Buy milk' })],
    })
    // From the Thought opened, as from its row.
    await page
      .locator('[data-slot="item-row"]')
      .filter({ hasText: 'Buy milk' })
      .getByRole('button', { name: /^Buy milk/ })
      .click()
    await page.getByRole('dialog').getByRole('button', { name: 'More' }).click()
    await page.getByRole('menuitem', { name: 'Shopping list' }).click()
    const ask = page.getByRole('dialog', { name: 'Shopping list' })
    await expect(ask).toContainText('Milk')
    await ask.getByRole('combobox', { name: 'Add to' }).click()
    await page.getByRole('option', { name: 'Big shop' }).click()
    await ask.getByRole('button', { name: 'Add' }).click()
    await expect(page.getByText('Added to "Big shop"')).toBeVisible()
    await expect
      .poll(() => db.lines.find((l) => l.pantry_id === MILK))
      .toMatchObject({ list_id: SHOP, meal_id: null })
    await expect.poll(() => db.items.find((i) => i.id === thought)?.archived_at).toBeTruthy()
  })
})
