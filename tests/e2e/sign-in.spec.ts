import { expect, test } from '@playwright/test'
import { ANN, queuedWrites, standIn } from './stand-in'

test('ACC-001: the sign-in page offers Google and no email sign-up', async ({ page }) => {
  await standIn(page)
  await page.goto('/today')
  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
  await expect(page.locator('input')).toHaveCount(0)
})

test('ACC-001: signed in, I land in the app with the navigation drawer', async ({
  page,
  isMobile,
}) => {
  await standIn(page, { signedIn: true })
  await page.goto('/')
  await expect(page).toHaveURL(/\/today$/)
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible()
  if (isMobile) await page.getByRole('button', { name: 'Menu' }).click()
  const pages = page.getByRole('navigation', { name: 'Pages' })
  await expect(pages.getByRole('link')).toHaveText([
    'Today',
    'Week',
    'Plan',
    'Notes',
    'Gym',
    'Cardio',
    'Recipes',
    'Meal plan',
    'Shopping',
    'Goals',
    'Wardrobe',
  ])
  await expect(page.getByText(ANN.name).filter({ visible: true })).toBeVisible()
  await pages.getByRole('link', { name: 'Plan', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Plan', level: 1 })).toBeVisible()
  if (isMobile) await expect(pages).toBeHidden()
})

test('ACC-003: signing out returns to the sign-in page and clears the device', async ({
  page,
  isMobile,
}) => {
  await standIn(page, { signedIn: true })
  await page.goto('/today')
  if (isMobile) await page.getByRole('button', { name: 'Menu' }).click()
  await page.evaluate(() => sessionStorage.setItem('stand-in-signed-out', '1'))
  await page.getByRole('link', { name: `${ANN.name}, Settings` }).click()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/sign-in$/)
  expect(
    await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('sb-'))),
  ).toEqual([])
})

test('ACC-003: signing out with writes not yet sent warns first', async ({ page, isMobile }) => {
  await standIn(page, { signedIn: true })
  await queuedWrites(page, 2)
  await page.goto('/today')
  if (isMobile) await page.getByRole('button', { name: 'Menu' }).click()
  await page.evaluate(() => sessionStorage.setItem('stand-in-signed-out', '1'))
  await page.getByRole('link', { name: `${ANN.name}, Settings` }).click()
  await page.getByRole('button', { name: 'Sign out' }).click()
  const warning = page.getByRole('alertdialog')
  await expect(warning).toContainText("2 changes haven't been sent yet and will be lost")
  await warning.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/sign-in$/)
  const left = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('lifeos-queue')
        open.onsuccess = () => {
          const count = open.result.transaction('entries').objectStore('entries').count()
          count.onsuccess = () => resolve(count.result)
        }
      }),
  )
  expect(left).toBe(0)
})

test('ACC-003 4: someone else signing in clears what the device kept for the last person', async ({
  page,
}) => {
  const db = await standIn(page, { signedIn: true })
  const theirs = '01a12254-e799-75ba-8d62-cb5f3f9e0901'
  // Ben's session here ended without signing out: his kept data and a write
  // he made offline are still on the device when Ann signs in.
  await page.addInitScript((id) => {
    if (localStorage.getItem('lifeos-device-owner')) return
    localStorage.setItem('lifeos-device-owner', 'ben')
    localStorage.setItem('lifeos.plan.layout', 'day')
    const open = indexedDB.open('lifeos-queue')
    open.onupgradeneeded = () => open.result.createObjectStore('entries')
    open.onsuccess = () =>
      open.result
        .transaction('entries', 'readwrite')
        .objectStore('entries')
        .put(
          {
            id,
            fn: 'create_item',
            args: { p_id: id, p_type: 'thought', p_title: 'Ben’s thought' },
            itemIds: [id],
            createdAt: Date.now(),
            attempts: 0,
            state: 'pending',
          },
          id,
        )
  }, theirs)
  await page.goto('/today')
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('lifeos-device-owner')))
    .toBe(ANN.id)
  expect(await page.evaluate(() => localStorage.getItem('lifeos.plan.layout'))).toBeNull()
  const left = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('lifeos-queue')
        open.onsuccess = () => {
          const count = open.result.transaction('entries').objectStore('entries').count()
          count.onsuccess = () => resolve(count.result)
        }
      }),
  )
  expect(left).toBe(0)
  // Never sent as Ann.
  expect(db.items.some((i) => i.id === theirs)).toBe(false)
})
