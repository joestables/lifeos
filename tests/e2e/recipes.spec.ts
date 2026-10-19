import { expect, test, type Page } from '@playwright/test'
import {
  BIRRIA,
  KATSU,
  KATSU_STD,
  PANKO,
  SAUCE,
  SHAKSHUKA,
  SHAKSHUKA_STD,
  id,
  rows,
} from './recipe-rows'
import { itemRow, standIn } from './stand-in'

async function start(page: Page, path = '/recipes') {
  const db = await standIn(page, { signedIn: true, rows: rows() })
  await page.goto(path)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  return db
}

const cards = (page: Page) => page.locator('[data-slot="recipe-card"]')
const cardNames = (page: Page) => cards(page).locator('button:not([aria-label])')

/** On a phone the filters are in a Sheet. */
async function openFilters(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole('button', { name: /^Filters/ }).click()
}

test.describe('Recipes', () => {
  test('RCP-001: the library shows Drafts and Completes as cards, newest first', async ({
    page,
  }) => {
    await start(page)
    await expect(cardNames(page)).toHaveText([
      'Shakshuka',
      'Gochujang noodles',
      'Katsu curry',
      'Katsu sauce',
    ])
    // A Draft is marked; Ideas and Archived Recipes don't show.
    await expect(
      cards(page).filter({ hasText: 'Gochujang noodles' }).getByText('Draft'),
    ).toBeVisible()
    await expect(page.getByText('Birria tacos')).toHaveCount(0)
    await expect(page.getByText('Old stew')).toHaveCount(0)
  })

  test('RCP-001: search by name, tag or ingredient', async ({ page }) => {
    await start(page)
    const search = page.getByRole('searchbox', { name: 'Search recipes' })
    await search.fill('panko')
    await expect(cardNames(page)).toHaveText(['Katsu curry'])
    await search.fill('korean')
    await expect(cardNames(page)).toHaveText(['Gochujang noodles'])
    await search.fill('nothing like this')
    await expect(page.getByText('No recipes match')).toBeVisible()
  })

  test('RCP-001: filters and sort are kept for next time', async ({ page, isMobile }) => {
    await start(page)
    await openFilters(page, isMobile)
    await page
      .getByRole('radio', { name: 'Draft' })
      .or(page.getByRole('button', { name: 'Draft', exact: true }))
      .first()
      .click()
    if (isMobile) await page.getByRole('button', { name: 'Show 1 recipe' }).click()
    await expect(cardNames(page)).toHaveText(['Gochujang noodles'])
    await openFilters(page, isMobile)
    await page
      .getByRole('button', { name: 'All', exact: true })
      .or(page.getByRole('radio', { name: 'All' }))
      .first()
      .click()
    await page
      .getByRole('button', { name: 'Dinner', exact: true })
      .or(page.getByRole('checkbox', { name: 'Dinner' }))
      .first()
      .click()
    if (isMobile) await page.getByRole('button', { name: /^Show 2 recipes/ }).click()
    await expect(cardNames(page)).toHaveText(['Gochujang noodles', 'Katsu curry'])
    await page.getByRole('combobox', { name: 'Sort' }).click()
    await page.getByRole('option', { name: 'A–Z' }).click()
    await expect(cardNames(page)).toHaveText(['Gochujang noodles', 'Katsu curry'])
    await page.reload()
    await expect(cardNames(page)).toHaveText(['Gochujang noodles', 'Katsu curry'])
    await expect(page.getByRole('combobox', { name: 'Sort' })).toContainText('A–Z')
  })

  test('RCP-015: my heart, and the favourites filter', async ({ page, isMobile }) => {
    const db = await start(page)
    await cards(page)
      .filter({ hasText: 'Shakshuka' })
      .getByRole('button', { name: 'Favourite' })
      .click()
    await expect.poll(() => db.marks).toEqual([{ item_id: SHAKSHUKA }])
    await openFilters(page, isMobile)
    await page.getByRole('button', { name: /^Favourites/ }).click()
    await page
      .getByRole('button', { name: 'Mine', exact: true })
      .or(page.getByRole('checkbox', { name: 'Mine' }))
      .first()
      .click()
    if (isMobile) await page.getByRole('button', { name: 'Show 1 recipe' }).click()
    await expect(cardNames(page)).toHaveText(['Shakshuka'])
  })

  test('RCP-006: a new Recipe needs a name no Recipe has, then opens to fill', async ({
    page,
    isMobile,
  }) => {
    const db = await start(page)
    if (isMobile) await page.getByRole('button', { name: 'New recipe' }).click()
    else {
      await page.getByRole('button', { name: 'New recipe' }).click()
      await page.getByRole('menuitem', { name: 'New recipe' }).click()
    }
    const dialog = page.getByRole('dialog', { name: 'New recipe' })
    await dialog.getByLabel('Name').fill('katsu  CURRY')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(dialog.getByText('You already have a recipe with this name')).toBeVisible()
    await dialog.getByLabel('Name').fill('Chicken shawarma')
    await dialog.getByRole('button', { name: 'Cuisine' }).click()
    await page.getByRole('textbox', { name: 'Cuisine' }).fill('Middle Eastern')
    await page.getByRole('textbox', { name: 'Cuisine' }).press('Enter')
    await page.keyboard.press('Escape')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('heading', { name: 'Edit variation' })).toBeVisible()
    await expect
      .poll(() => db.items.find((i) => i.title === 'Chicken shawarma')?.status)
      .toBe('active')
    const made = db.items.find((i) => i.title === 'Chicken shawarma')!
    await expect
      .poll(() => db.recipe.find((r) => r.item_id === made.id)?.cuisine)
      .toBe('Middle Eastern')
    expect(db.values).toEqual([
      expect.objectContaining({ kind: 'cuisine', name: 'Middle Eastern' }),
    ])
    // Done shows the new Recipe.
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByRole('heading', { name: 'Chicken shawarma', level: 1 })).toBeVisible()
  })

  test('RCP-002: an Idea needs only a name; Ideas list newest first; one becomes a Draft', async ({
    page,
    isMobile,
  }) => {
    const db = await start(page, '/recipes?tab=ideas')
    await expect(page.getByText('Birria tacos')).toBeVisible()
    await expect(page.getByText('youtube.com')).toBeVisible()
    await page.getByRole('button', { name: 'New idea' }).first().click()
    const dialog = page.getByRole('dialog', { name: 'New idea' })
    await dialog.getByLabel('Name').fill('Crispy chilli beef')
    await dialog.getByLabel('Link 1').fill('https://www.tiktok.com/@kian/video/7')
    await dialog.getByLabel('Note').fill('Double fry the beef')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('button', { name: /Crispy chilli beef/ }).first()).toBeVisible()
    await expect(page.getByText('tiktok.com')).toBeVisible()
    await expect
      .poll(() => db.items.find((i) => i.title === 'Crispy chilli beef')?.status)
      .toBe('idea')
    // Make it a draft: it leaves Ideas for the library.
    const row = page.locator('[data-slot="item-row"]').filter({ hasText: 'Birria tacos' })
    await row.getByRole('button', { name: 'More' }).click()
    await page.getByRole('menuitem', { name: 'Make it a draft' }).click()
    await expect(page.getByText('Birria tacos')).toHaveCount(0)
    await expect.poll(() => db.items.find((i) => i.id === BIRRIA)?.status).toBe('active')
    await page.getByRole('tab', { name: 'Recipes' }).click()
    await expect(cards(page).filter({ hasText: 'Birria tacos' })).toBeVisible()
    void isMobile
  })

  test('RCP-004, RCP-010: choose several and archive them, with Undo', async ({
    page,
    isMobile,
  }) => {
    const db = await start(page)
    if (isMobile) {
      // A long press by touch starts choosing, with the pressed card chosen.
      const card = cards(page).filter({ hasText: 'Shakshuka' })
      await card.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true })
      await page.waitForTimeout(700)
      await card.dispatchEvent('pointerup', { pointerType: 'touch', isPrimary: true })
      await expect(page.getByText('1 selected')).toBeVisible()
    } else {
      await page.getByRole('button', { name: 'Select' }).click()
      await page.getByRole('checkbox', { name: 'Shakshuka' }).click()
    }
    await page.getByRole('checkbox', { name: 'Katsu sauce' }).click()
    await expect(page.getByText('2 selected')).toBeVisible()
    await page.getByRole('button', { name: 'Archive' }).click()
    await expect(cardNames(page)).toHaveText(['Gochujang noodles', 'Katsu curry'])
    await expect.poll(() => db.items.find((i) => i.id === SHAKSHUKA_STD)?.status).toBe('cancelled')
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(cardNames(page)).toHaveCount(4)
    await expect.poll(() => db.items.find((i) => i.id === SHAKSHUKA_STD)?.status).toBe('done')
  })

  test('RCP-005, RCP-008: a Recipe to read, its references opening the other Recipe', async ({
    page,
  }) => {
    await start(page)
    await cards(page)
      .filter({ hasText: 'Katsu curry' })
      .getByRole('button', { name: 'Katsu curry' })
      .click()
    await expect(page.getByRole('heading', { name: 'Katsu curry', level: 1 })).toBeVisible()
    await expect(page.getByText('Prep 20 min · Cook 25 min')).toBeVisible()
    await expect(page.getByText('Serves 4')).toBeVisible()
    for (const fact of ['Dinner', 'Japanese', 'Chicken', 'Quick'])
      await expect(page.getByText(fact, { exact: true })).toBeVisible()
    await expect(page.getByText('For the sauce')).toBeVisible()
    await expect(page.getByText('1–2 tbsp')).toBeVisible()
    await expect(page.getByText('100 g')).toBeVisible()
    await page.getByRole('button', { name: 'Katsu sauce' }).click()
    await expect(page.getByRole('heading', { name: 'Katsu sauce', level: 1 })).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('heading', { name: 'Katsu curry', level: 1 })).toBeVisible()
  })

  test('RCP-007, RCP-008: editing lines and steps, kept as they are left', async ({ page }) => {
    const db = await start(page, `/recipes/${KATSU}?edit=variation`)
    void db
    await expect(page.getByRole('heading', { name: 'Edit variation' })).toBeVisible()
    // "200 g chorizo" typed whole: read into its boxes, kept as typed.
    await page.getByRole('button', { name: 'Add an ingredient' }).click()
    const ingredient = page.getByRole('textbox', { name: 'Ingredient' }).last()
    await ingredient.fill('200 g chorizo')
    await page.getByRole('button', { name: 'Keep as typed' }).click()
    await expect
      .poll(() => db.variation_lines.find((l) => l.text === 'Chorizo'))
      .toMatchObject({ qty: 200, unit: 'g', pantry_id: null })
    // A Pantry match, chosen with Enter.
    await page.getByRole('button', { name: 'Add an ingredient' }).click()
    await page.getByRole('textbox', { name: 'Ingredient' }).last().fill('pank')
    await expect(page.getByRole('option', { name: 'Panko breadcrumbs' })).toBeVisible()
    await page.getByRole('textbox', { name: 'Ingredient' }).last().press('Enter')
    await expect.poll(() => db.variation_lines.filter((l) => l.pantry_id === PANKO)).toHaveLength(2)
    // An amount changed.
    const honey = page
      .locator('[data-reorder-id]')
      .filter({ has: page.locator('input[value="Honey"]') })
    await honey.getByLabel('Amount').fill('2')
    await honey.getByLabel('Amount').blur()
    await expect
      .poll(() => db.variation_lines.find((l) => l.text === 'Honey'))
      .toMatchObject({ qty: 2, qty_max: null })
    // A step with an "@" reference.
    await page.getByRole('button', { name: 'Add a step' }).click()
    const step = page.getByRole('textbox', { name: 'Step 4' })
    await step.pressSequentially('Serve with @kats')
    await expect(page.getByRole('option', { name: 'Katsu sauce' })).toBeVisible()
    await step.press('Enter')
    await expect(step).toHaveValue('Serve with @Katsu sauce ')
    await step.blur()
    await expect
      .poll(() => db.variation_steps.find((s) => String(s.text).startsWith('Serve with'))?.text)
      .toBe(`Serve with @[Katsu sauce](${SAUCE})`)
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByRole('heading', { name: 'Katsu curry', level: 1 })).toBeVisible()
    await expect(page.getByText('Chorizo', { exact: true })).toBeVisible()
  })

  test('RCP-009: a Variation duplicated, switched to and compared', async ({ page }) => {
    const db = await start(page, `/recipes/${KATSU}`)
    await page.getByRole('button', { name: 'More' }).click()
    await page.getByRole('menuitem', { name: 'Duplicate this variation' }).click()
    const dialog = page.getByRole('dialog', { name: 'Duplicate variation' })
    await dialog.getByLabel('Name').fill('Air fryer')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('heading', { name: 'Edit variation' })).toBeVisible()
    await expect
      .poll(() =>
        db.variation_lines.filter(
          (l) => String(l.variation_id) !== KATSU_STD && String(l.id).endsWith(id(33)),
        ),
      )
      .toHaveLength(1)
    const honey = page
      .locator('[data-reorder-id]')
      .filter({ has: page.locator('input[value="Honey"]') })
    await honey.getByLabel('Amount').fill('3')
    await honey.getByLabel('Amount').blur()
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByRole('combobox', { name: 'Variation' })).toContainText('Air fryer')
    await page.getByRole('button', { name: 'More' }).click()
    await page.getByRole('menuitem', { name: 'Compare variations' }).click()
    await expect(page.getByRole('heading', { name: 'Compare variations' })).toBeVisible()
    await expect(page.getByText('Differs')).toHaveCount(2)
  })

  test('RCP-011, RCP-012: Cooking scales, picks out the step, times it, and logs how it went', async ({
    page,
  }) => {
    const db = await start(page, `/recipes/${KATSU}`)
    await page.getByRole('button', { name: 'Start cooking' }).click()
    await expect(page.getByText('Cooking · Standard')).toBeVisible()
    await page.getByRole('button', { name: 'More servings' }).first().click()
    await page.getByRole('button', { name: 'More servings' }).first().click()
    await expect(page.getByText('Serves 6').filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByText('150 g')).toBeVisible()
    await expect(page.getByText('1½–3 tbsp')).toBeVisible()
    await expect(page.getByText('Not scaled')).toBeVisible()
    await page.getByRole('button', { name: "I'm on step 3" }).click()
    await expect(page.getByRole('button', { name: "I'm on step 3" })).toHaveAttribute(
      'aria-current',
      'step',
    )
    await page.getByRole('button', { name: 'Start 12:00' }).click()
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
    // Leaving and coming back finds it as it was (RCP-011 5).
    await page.reload()
    await expect(page.getByText('Serves 6').filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
    await page.getByRole('button', { name: 'Finish' }).click()
    const dialog = page.getByRole('dialog', { name: 'How did it go?' })
    await dialog.getByRole('radio', { name: '4 out of 5' }).click()
    await dialog.getByPlaceholder('Notes').fill('More honey next time')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('heading', { name: 'Katsu curry', level: 1 })).toBeVisible()
    await expect
      .poll(() => db.cooks)
      .toEqual([
        expect.objectContaining({
          variation_id: KATSU_STD,
          verdict: 4,
          notes: 'More honey next time',
          servings: 6,
        }),
      ])
    await expect(page.getByText('Cooked once · last')).toBeVisible()
    await expect(page.getByText('More honey next time')).toBeVisible()
  })

  test('RCP-013: the log says what changed', async ({ page }) => {
    await start(page, `/recipes/${KATSU}?edit=variation`)
    await page.getByLabel('Serves').fill('6')
    await page.getByLabel('Serves').blur()
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByText('Serves 4 → 6')).toBeVisible()
  })

  test('RCP-016, SRC-003: Search finds Recipes and Ideas by name, tag or ingredient', async ({
    page,
    isMobile,
  }) => {
    await start(page)
    if (isMobile) await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    const input = page.getByRole('combobox', { name: 'Search' })
    await input.fill('panko')
    const list = page.getByRole('listbox', { name: 'Search' })
    await expect(list.getByRole('group', { name: 'Recipes' }).getByRole('option')).toHaveText([
      /Katsu curry/,
    ])
    // Each shows its state; an Archived one is found, marked so (SRC-003 1).
    await expect(list.getByRole('option', { name: /Katsu curry/ })).toContainText('Complete')
    await input.fill('stew')
    await expect(list.getByRole('option', { name: /Old stew/ })).toContainText('Archived')
    // A Variation is found as its Recipe, never on its own.
    await input.fill('standard')
    await expect(list.getByRole('group', { name: 'Variations' })).toHaveCount(0)
    await input.fill('panko')
    await list.getByRole('option', { name: /Katsu curry/ }).click()
    await expect(page.getByRole('heading', { name: 'Katsu curry', level: 1 })).toBeVisible()
  })

  test('RCP-002: a Thought sorted into a Recipe is an Idea', async ({ page }) => {
    const db = await standIn(page, {
      signedIn: true,
      rows: {
        ...rows(),
        items: [
          ...rows().items!,
          itemRow({ id: id(50), type: 'thought', title: 'Crispy chilli beef' }),
        ],
      },
    })
    await page.goto('/inbox')
    const row = page.locator('[data-slot="item-row"]').filter({ hasText: 'Crispy chilli beef' })
    await row.getByRole('button', { name: 'More' }).click()
    await page.getByRole('menuitem', { name: 'Recipe' }).click()
    await expect(row).toBeHidden()
    await expect.poll(() => db.items.find((i) => i.id === id(50))?.type).toBe('recipe')
    await page.getByRole('button', { name: 'Open' }).click()
    await expect(page.getByRole('heading', { name: 'Crispy chilli beef', level: 1 })).toBeVisible()
  })

  test('RCP-010: an archived Recipe leaves both tabs and comes back as it was from Settings', async ({
    page,
  }) => {
    const db = await start(page, `/recipes/${KATSU}`)
    await page.getByRole('button', { name: 'More' }).click()
    await page.getByRole('menuitem', { name: 'Archive' }).click()
    await expect(page.getByRole('heading', { name: 'Recipes', level: 1 })).toBeVisible()
    await expect(cardNames(page)).toHaveText(['Shakshuka', 'Gochujang noodles', 'Katsu sauce'])
    await expect.poll(() => db.items.find((i) => i.id === KATSU_STD)?.status).toBe('cancelled')
    await page.goto('/settings')
    await page.getByRole('link', { name: /Archived recipes/ }).click()
    const row = page.locator('[data-slot="item-row"]').filter({ hasText: 'Katsu curry' })
    await row.getByRole('button', { name: 'Bring back' }).click()
    await expect(row).toBeHidden()
    await expect.poll(() => db.items.find((i) => i.id === KATSU)?.status).toBe('done')
    await page.goto('/recipes')
    await expect(cardNames(page)).toHaveText([
      'Shakshuka',
      'Gochujang noodles',
      'Katsu curry',
      'Katsu sauce',
    ])
  })

  test('RCP-012, RCP-013: a cook from earlier, what was cooked, and my verdict changed', async ({
    page,
  }) => {
    const db = await start(page, `/recipes/${KATSU}`)
    await page.getByRole('button', { name: 'More' }).click()
    await page.getByRole('menuitem', { name: 'Log a cook' }).click()
    const dialog = page.getByRole('dialog', { name: 'Log a cook' })
    await expect(dialog.getByLabel('Cooked on')).toBeVisible()
    await dialog.getByRole('radio', { name: '3 out of 5' }).click()
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect
      .poll(() => db.cooks)
      .toEqual([expect.objectContaining({ verdict: 3, servings: 4 })])
    await page.getByRole('button', { name: 'What I cooked · Serves 4' }).click()
    const snap = page.getByRole('dialog', { name: 'Standard · Serves 4' })
    await expect(snap.getByText('Panko breadcrumbs')).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Edit', exact: true }).last().click()
    const edit = page.getByRole('dialog', { name: 'How did it go?' })
    await edit.getByRole('radio', { name: '5 out of 5' }).click()
    await edit.getByPlaceholder('Notes').fill('Perfect')
    await edit.getByRole('button', { name: 'Save' }).click()
    await expect.poll(() => db.cooks[0]).toMatchObject({ verdict: 5, notes: 'Perfect' })
    await expect(page.getByText('Perfect')).toBeVisible()
  })
})
