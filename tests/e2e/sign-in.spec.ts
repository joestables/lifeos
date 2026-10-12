import { expect, test } from '@playwright/test'
import { ANN, queuedWrites, standIn } from './stand-in'

test('ACC-001: the sign-in page offers Google and no email sign-up', async ({ page }) => {
  await standIn(page)
  await page.goto('/inbox')
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
  await expect(page).toHaveURL(/\/inbox$/)
  await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible()
  if (isMobile) await page.getByRole('button', { name: 'Menu' }).click()
  const pages = page.getByRole('navigation', { name: 'Pages' })
  await expect(pages.getByRole('link')).toHaveText([
    'Inbox',
    'Plan',
    'Tasks',
    'Notes',
    'Recipes',
    'Gym',
    'Goals',
    'Wardrobe',
  ])
  await expect(page.getByText(ANN.name).filter({ visible: true })).toBeVisible()
  await pages.getByRole('link', { name: 'Tasks' }).click()
  await expect(page.getByRole('heading', { name: 'Tasks', level: 1 })).toBeVisible()
  if (isMobile) await expect(pages).toBeHidden()
})

test('ACC-003: signing out returns to the sign-in page and clears the device', async ({
  page,
  isMobile,
}) => {
  await standIn(page, { signedIn: true })
  await page.goto('/inbox')
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
  await page.goto('/inbox')
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
