// Screenshots a page in dark and light, at desktop and phone width, for
// pull requests (docs/30-design/README.md, step 8). Usage:
//   node scripts/screenshot.mjs <url> <output prefix> [button names to open…]
import { chromium } from '@playwright/test'

const [url, out, ...open] = process.argv.slice(2)
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
})
for (const colorScheme of ['dark', 'light']) {
  for (const [width, height, tag] of [
    [1280, 900, 'desktop'],
    [390, 844, 'phone'],
  ]) {
    const page = await browser.newPage({ colorScheme, viewport: { width, height } })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: `${out}-${colorScheme}-${tag}.png`, fullPage: true })
    if (tag === 'desktop') {
      for (const name of open) {
        await page.getByRole('button', { name, exact: true }).click()
        await page.waitForTimeout(400)
        await page.screenshot({ path: `${out}-${colorScheme}-${name.toLowerCase()}.png` })
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
      }
    }
    if (errors.length) console.log(colorScheme, tag, errors)
    await page.close()
  }
}
await browser.close()
