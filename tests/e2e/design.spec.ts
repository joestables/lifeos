import { expect, test } from '@playwright/test'

/** Screenshot tests of the design-system page: unintended visual change fails CI. */
for (const colorScheme of ['dark', 'light'] as const) {
  test(`the design system looks as agreed (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/design')
    // The page's code loads on its own: wait for it to be drawn, not a blank page.
    await expect(page.getByRole('heading', { name: 'Design system', level: 1 })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    await expect(page).toHaveScreenshot(`design-${colorScheme}.png`, { fullPage: true })
  })
}
