import { expect, test } from '@playwright/test'

/** Screenshot tests of the design-system page: unintended visual change fails CI. */
for (const colorScheme of ['dark', 'light'] as const) {
  test(`the design system looks as agreed (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/design')
    await page.evaluate(() => document.fonts.ready)
    await expect(page).toHaveScreenshot(`design-${colorScheme}.png`, { fullPage: true })
  })
}
