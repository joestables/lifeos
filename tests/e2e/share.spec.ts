import { expect, test, type Page, type Route } from '@playwright/test'
import { rows } from './recipe-rows'
import { standIn } from './stand-in'

const TIKTOK = 'https://www.tiktok.com/@chefjack/video/123'
const shared = `Crispy chilli beef 🔥 #recipe ${TIKTOK}?_r=1&_t=abc`

async function start(page: Page, path: string, ai = { name: 'Crispy chilli beef noodles' }) {
  const db = await standIn(page, { signedIn: true, rows: rows(), ai })
  await page.goto(path)
  return db
}

const ideaOf = (db: Awaited<ReturnType<typeof start>>) => {
  const v = db.variation.find((x) => (x.sources as string[] | undefined)?.includes(TIKTOK))
  const link =
    v && db.links.find((l) => l.from_item === v.item_id && l.link_type === 'variation_of')
  return link && db.items.find((i) => i.id === link.to_item)
}

test.describe('Sharing a recipe in', () => {
  test('RCP-003 1: a shared link kept as an Idea at once, its name filled in', async ({ page }) => {
    const db = await start(page, `/share?text=${encodeURIComponent(shared)}`)
    await expect(page.getByRole('heading', { name: 'Saved as an idea' })).toBeVisible()
    await expect(page.getByText('tiktok.com')).toBeVisible()
    // Nothing to press: it's kept, with the link as typed by no one.
    await expect.poll(() => ideaOf(db)?.status).toBe('idea')
    await expect.poll(() => ideaOf(db)?.title).toBe('Crispy chilli beef noodles')
    await expect(page.getByText('Crispy chilli beef noodles')).toBeVisible()
  })

  test('RCP-003 2: a link saved before isn’t kept again, and opens', async ({ page }) => {
    const db = await start(
      page,
      `/share?url=${encodeURIComponent('https://www.youtube.com/watch?v=b1#t=2')}`,
    )
    await expect(page.getByRole('heading', { name: 'Already saved' })).toBeVisible()
    const before = db.items.length
    await page.getByRole('button', { name: 'Open' }).click()
    await expect(page.getByRole('dialog', { name: 'Idea' }).getByLabel('Name')).toHaveValue(
      'Birria tacos',
    )
    expect(db.items.length).toBe(before)
  })

  test('RCP-003 3: with no signal it is kept, and named when the signal returns', async ({
    page,
    context,
  }) => {
    const db = await standIn(page, {
      signedIn: true,
      rows: rows(),
      ai: { name: 'Crispy chilli beef noodles' },
    })
    // Its page loaded once, as the installed app keeps it offline.
    await page.goto('/share')
    await page.getByRole('button', { name: 'Recipes' }).click()
    await expect(page.getByRole('heading', { name: 'Recipes', level: 1 })).toBeVisible()
    // The stand-in answers before the network, so its answers are refused too.
    const noSignal = (route: Route) => route.abort('internetdisconnected')
    await page.route('**/rest/v1/**', noSignal)
    await page.route('**/functions/v1/**', noSignal)
    await context.setOffline(true)
    // Opened from inside the app, as the share sheet would open it.
    await page.evaluate(
      (to) => {
        history.pushState({}, '', to)
        dispatchEvent(new PopStateEvent('popstate'))
      },
      `/share?text=${encodeURIComponent(shared)}`,
    )
    await expect(page.getByRole('heading', { name: 'Saved as an idea' })).toBeVisible()
    await expect(page.getByText('Crispy chilli beef 🔥')).toBeVisible()
    expect(ideaOf(db)).toBeUndefined()
    // The signal comes back.
    await page.unroute('**/rest/v1/**', noSignal)
    await page.unroute('**/functions/v1/**', noSignal)
    await context.setOffline(false)
    await expect.poll(() => ideaOf(db)?.title).toBe('Crispy chilli beef noodles')
  })

  test('RCP-003 4: the iOS Shortcut opens New idea with the link and its name', async ({
    page,
  }) => {
    const db = await start(page, `/recipes?tab=ideas&share=${encodeURIComponent(TIKTOK)}`)
    const dialog = page.getByRole('dialog', { name: 'New idea' })
    await expect(dialog.getByLabel('Name')).toHaveValue('Crispy chilli beef noodles')
    await expect(dialog.getByRole('textbox', { name: 'Link' }).first()).toHaveValue(TIKTOK)
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect.poll(() => ideaOf(db)?.title).toBe('Crispy chilli beef noodles')
  })
})
