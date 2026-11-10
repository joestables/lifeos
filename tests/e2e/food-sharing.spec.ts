import { expect, test, type Page } from '@playwright/test'
import { DISHOOM, KATSU_MEAL, LEFTOVERS, NOW, addMeal, mealCards, mealRows } from './meal-rows'
import { BIN_BAGS, GARLIC, SAM } from './pantry-rows'
import { id } from './recipe-rows'
import { ANN, itemRow, standIn, type Rows } from './stand-in'

const HOME = '00000000-0000-7000-8000-0000000000f1'
const RAMEN = id(80)
const RAMEN_STD = id(81)
const SHARED = id(82)

/**
 * The Meal plan's rows, with Ann and Sam in Home: Sam's Recipe, a Meal in
 * Home, and Home's staples beside Ann's own (SHP-005).
 */
function rows(meals: string | null = null): Rows {
  const base = mealRows()
  return {
    ...base,
    people: [{ meal_space_id: meals }],
    spaces: [{ id: HOME, name: 'Home', created_by: ANN.id }],
    space_members: [
      { space_id: HOME, person_id: ANN.id, role: 'owner', name: ANN.name },
      { space_id: HOME, person_id: SAM, role: 'member', name: 'Sam Carter' },
    ],
    items: [
      ...(base.items ?? []),
      itemRow({ id: RAMEN, type: 'recipe', title: 'Shoyu ramen', status: 'done', owner_id: SAM }),
      itemRow({
        id: RAMEN_STD,
        type: 'variation',
        title: 'Standard',
        status: 'done',
        owner_id: SAM,
      }),
      itemRow({
        id: SHARED,
        type: 'meal',
        title: 'Out: Wagamama',
        do_on: '2026-10-14',
        slot: 'dinner',
        space_id: HOME,
        owner_id: SAM,
      }),
    ],
    links: [
      ...(base.links ?? []),
      { from_item: RAMEN_STD, to_item: RAMEN, link_type: 'variation_of' },
    ],
    recipe: [
      ...(base.recipe ?? []),
      { item_id: RAMEN, category: 'Dinner', cuisine: 'Japanese', default_variation: RAMEN_STD },
    ],
    variation: [...(base.variation ?? []), { item_id: RAMEN_STD, servings: 2 }],
    meal: [...(base.meal ?? []), { item_id: SHARED, servings: null, leftovers_of: null }],
    pantry: [
      ...(base.pantry ?? []),
      {
        id: GARLIC,
        name: 'Garlic',
        kind: 'ingredient',
        aisle: 'fruit_veg',
        default_unit: null,
        added_by: ANN.id,
      },
      {
        id: BIN_BAGS,
        name: 'Bin bags',
        kind: 'household',
        aisle: null,
        default_unit: null,
        added_by: ANN.id,
      },
    ],
    space_entries: [
      { space_id: 's', pantry_id: GARLIC, kind: 'staple', needed: false },
      { space_id: HOME, pantry_id: BIN_BAGS, kind: 'staple', needed: true },
    ],
  }
}

async function start(page: Page, path: string, meals: string | null = null) {
  await page.clock.setFixedTime(NOW)
  const db = await standIn(page, { signedIn: true, rows: rows(meals) })
  await page.goto(path)
  return db
}

const cards = mealCards

test.describe('Food shared through a Household', () => {
  test('MPL-005: Settings → Food chooses where new Meals go', async ({ page }) => {
    const db = await start(page, '/settings')
    const field = page.getByRole('combobox', { name: 'New meals are for' })
    await expect(field).toContainText('Personal')
    await field.click()
    await page.getByRole('option', { name: 'Home' }).click()
    await expect(field).toContainText('Home')
    await expect.poll(() => db.people[0]!.meal_space_id).toBe(HOME)
  })

  test('MPL-002 2: a new Meal goes where my default says', async ({ page }) => {
    const db = await start(page, '/meal-plan', HOME)
    await addMeal(page, '2026-10-18:lunch')
    await page.getByRole('button', { name: 'Type a meal' }).click()
    await page.getByRole('textbox', { name: 'Meal' }).fill('Sunday roast')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect
      .poll(() => db.items.find((i) => i.title === 'Sunday roast'))
      .toMatchObject({ space_id: HOME })
  })

  test('MPL-001 5, HSH-003 1: the week shows all my Meals, one Household’s, or Personal', async ({
    page,
  }) => {
    await start(page, '/meal-plan')
    // All: a Personal Meal has a lock beside Home's.
    await expect(cards(page, '2026-10-14:dinner')).toHaveText(/Out: Wagamama/)
    await expect(cards(page, '2026-10-15:dinner').getByLabel('Personal')).toBeVisible()
    await expect(cards(page, '2026-10-14:dinner').getByLabel('Personal')).toHaveCount(0)

    const show = page.getByRole('combobox', { name: 'Show' })
    await show.click()
    await page.getByRole('option', { name: 'Home' }).click()
    await expect(cards(page, '2026-10-14:dinner')).toHaveCount(1)
    await expect(cards(page, '2026-10-15:dinner')).toHaveCount(0)

    await show.click()
    await page.getByRole('option', { name: 'Personal' }).click()
    await expect(cards(page, '2026-10-14:dinner')).toHaveCount(0)
    await expect(cards(page, '2026-10-15:dinner')).toHaveCount(1)
    // Kept for next time on this device.
    await page.reload()
    await expect(page.getByRole('combobox', { name: 'Show' })).toContainText('Personal')
  })

  test('MPL-003 1, HSH-003 2: a Meal made Home’s takes its leftovers with it', async ({ page }) => {
    const db = await start(page, '/meal-plan')
    await cards(page, '2026-10-15:dinner').getByRole('button', { name: 'Katsu curry' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('combobox', { name: 'For' }).click()
    await page.getByRole('option', { name: 'Home' }).click()
    await expect.poll(() => db.items.find((i) => i.id === KATSU_MEAL)?.space_id).toBe(HOME)
    await expect.poll(() => db.items.find((i) => i.id === LEFTOVERS)?.space_id).toBe(HOME)
    expect(db.items.find((i) => i.id === DISHOOM)?.space_id).toBe('s')
  })

  test('HSH-003 2: someone else’s Meal can’t be moved to another Space', async ({ page }) => {
    await start(page, '/meal-plan')
    await cards(page, '2026-10-14:dinner').getByRole('button', { name: 'Out: Wagamama' }).click()
    await expect(page.getByRole('dialog').getByText('Out: Wagamama').first()).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'For' })).toHaveCount(0)
  })

  test('RCP-001 5: Created by lists me and Home’s members; a member’s Recipe says whose', async ({
    page,
    isMobile,
  }) => {
    await start(page, '/recipes')
    await expect(page.getByText('Shoyu ramen')).toBeVisible()
    if (isMobile) await page.getByRole('button', { name: /Filters/ }).click()
    await page.getByRole('button', { name: /^Created by/ }).click()
    await expect(page.getByText('Me', { exact: true })).toBeVisible()
    await page
      .getByRole('button', { name: 'Sam Carter', exact: true })
      .or(page.getByRole('checkbox', { name: 'Sam Carter' }))
      .first()
      .click()
    if (isMobile) await page.getByRole('button', { name: 'Show 1 recipe' }).click()
    await expect(page.getByText('Shoyu ramen')).toBeVisible()
    await expect(page.getByText('Katsu curry')).toHaveCount(0)

    await page.getByText('Shoyu ramen').click()
    await expect(page.getByText('By Sam', { exact: true })).toBeVisible()
  })

  test('RCP-004 1: choosing several, a member’s Recipe fades, saying whose', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Select is a computer’s; a phone long-presses one of mine')
    await start(page, '/recipes')
    await page.getByRole('button', { name: 'Select' }).click()
    const ramen = page.locator('[data-slot="recipe-card"]').filter({ hasText: 'Shoyu ramen' })
    await expect(ramen).toContainText('Japanese · Sam’s')
    await expect(ramen.getByRole('checkbox')).toHaveAttribute('aria-disabled', 'true')
    const katsu = page.locator('[data-slot="recipe-card"]').filter({ hasText: 'Katsu curry' })
    await katsu.getByRole('checkbox').click()
    await expect(katsu.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true')
  })

  test('MPL-002 1: the picker says whose a member’s Recipe is', async ({ page }) => {
    await start(page, '/meal-plan')
    await addMeal(page, '2026-10-18:dinner')
    await page.getByRole('dialog').getByRole('searchbox', { name: 'Search recipes' }).fill('ramen')
    await expect(page.getByRole('button', { name: /Shoyu ramen/ })).toContainText('Japanese · Sam')
  })

  test('HSH-003 1: on Plan a Household’s Item says which', async ({ page }) => {
    await start(page, '/week?day=2026-10-14')
    await expect(page.getByRole('button', { name: /Out: Wagamama/ }).first()).toBeVisible()
    await expect(page.getByText(/Dinner · Home/).first()).toBeVisible()
  })
})
