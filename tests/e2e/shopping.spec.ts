import { expect, test, type Locator, type Page, type Route } from '@playwright/test'
import { KATSU_MEAL, NOW, mealRows } from './meal-rows'
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
    const db = await start(page, '/inbox', mealRows())
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
    await expect(line(aisle(page, 'Protein'), 'Chicken thighs')).toContainText('Katsu curry Thu')
    await expect(line(aisle(page, 'Cupboard'), 'Panko breadcrumbs')).toContainText('100 g')
  })

  test('SHP-003 1, 2: added from the Pantry or typed, joining the Meal’s total', async ({
    page,
  }) => {
    const db = await start(page, `/shopping/${SHOP}`)
    const add = page.getByRole('textbox', { name: 'Add to the shop' })
    await add.fill('2 chick')
    await page.keyboard.press('Enter')
    await expect(line(aisle(page, 'Protein'), 'Chicken thighs')).toContainText('6')
    await expect(line(aisle(page, 'Protein'), 'Chicken thighs')).toContainText('Extra')
    await add.fill('Sourdough')
    await expect(page.getByText('Add "Sourdough" as typed')).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(line(aisle(page, 'Other'), 'Sourdough')).toBeVisible()
    await expect
      .poll(() => db.lines.filter((l) => !l.meal_id).map((l) => l.pantry_id ?? l.text))
      .toEqual([CHICKEN, 'Sourdough'])
    // A Meal's line has no menu: it changes with its Meal.
    await page.getByRole('tab', { name: /Meals/ }).click()
    await expect(
      page.getByRole('group', { name: 'Katsu curry' }).getByRole('button', { name: 'More' }),
    ).toHaveCount(1)
  })

  test('SHP-003 3, 4: Extra offers what’s needed; ticked, it’s in stock again', async ({
    page,
  }) => {
    const db = await start(page, `/shopping/${SHOP}`)
    // Panko is a staple the Meal uses: not on All, but to check on Extra.
    await expect(line(page, 'Panko')).toHaveCount(0)
    await page.getByRole('tab', { name: /Extra/ }).click()
    await expect(page.getByRole('group', { name: /Staples the meals use/ })).toContainText('Panko')
    const needed = page.getByRole('group', { name: 'Needed · Personal' })
    await expect(needed).toContainText('Out of stock')
    await needed.getByRole('button', { name: 'Add Milk' }).click()
    await expect(needed.getByText('Added')).toBeVisible()
    await expect
      .poll(() => db.lines.find((l) => l.pantry_id === MILK))
      .toMatchObject({ needed_space_id: 's' })
    await line(page.getByRole('group', { name: 'Added' }), 'Milk')
      .getByRole('checkbox')
      .click()
    await expect.poll(() => db.space_entries.find((e) => e.pantry_id === MILK)?.needed).toBe(false)
  })

  test('SHP-001 4, 5: ticked to the last line, Done; done shops a press away', async ({ page }) => {
    const db = await start(page, `/shopping/${SHOP}`)
    await line(page, 'Chicken thighs').getByRole('checkbox').click()
    await expect(line(aisle(page, 'Protein'), 'Chicken thighs').getByRole('checkbox')).toBeChecked()
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

  test('SHP-005: staples and Essentials kept on Food, out of stock and Required', async ({
    page,
  }) => {
    const db = await start(page)
    const staples = page.getByRole('group', { name: 'Staples' })
    await expect(staples.getByRole('button', { name: 'Salt out of stock' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await staples.getByRole('textbox', { name: 'Add a staple' }).fill('Chick')
    await page.keyboard.press('Enter')
    await expect
      .poll(() => db.space_entries.find((e) => e.pantry_id === CHICKEN))
      .toMatchObject({ kind: 'staple', needed: false })
    await staples.getByRole('button', { name: 'Chicken thighs out of stock' }).click()
    await expect
      .poll(() => db.space_entries.find((e) => e.pantry_id === CHICKEN)?.needed)
      .toBe(true)
    const essentials = page.getByRole('group', { name: 'Essentials' })
    await expect(essentials.getByRole('button', { name: 'Milk required' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await essentials.getByRole('button', { name: 'More' }).click()
    await page.getByRole('menuitem', { name: 'Take off' }).click()
    await expect.poll(() => db.space_entries.some((e) => e.pantry_id === MILK)).toBe(false)
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
    const db = await start(page, '/plan?day=2026-10-17')
    const card = page.locator('[data-slot="plan-card"]').filter({ hasText: 'Big shop' })
    await expect(card).toBeVisible()
    await page.goto('/plan?day=2026-10-16')
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
    await start(page, '/inbox')
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
    await page.getByRole('button', { name: 'Stop selecting' }).click()
    // Thursday's dinner, not Friday's leftovers of it.
    await page
      .locator('[data-drop="2026-10-15:dinner"]')
      .last()
      .getByRole('button', { name: 'Katsu curry' })
      .click()
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
})
