// Screenshots of a stage's design page (/design-stage-3, /design-stage-4, /design-stage-4b, /design-stage-5, /design-stage-7), dark and
// light, for the design canvas (each stage's plan, step 3). Usage, with the dev
// server running:
//   node scripts/design-shots.mjs http://localhost:5173 <out dir> week day m:m-day …
// "m:" takes a screen at phone width; DESIGN_PAGE=design-stage-4 picks the page
// (design-stage-3 by default).
import { chromium } from '@playwright/test'
const [base, out, ...screens] = process.argv.slice(2)
const designPage = process.env.DESIGN_PAGE ?? 'design-stage-3'
const browser = await chromium.launch({
  args: ['--lang=en-GB'],
  env: { ...process.env, LANG: 'en_GB.UTF-8', LANGUAGE: 'en_GB' },
})
for (const entry of screens) {
  const phone = entry.startsWith('m:')
  const screen = phone ? entry.slice(2) : entry
  for (const scheme of ['dark', 'light']) {
    const page = await browser.newPage({
      colorScheme: scheme,
      viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      locale: 'en-GB',
    })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await page.goto(`${base}/${designPage}?screen=${screen}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await page.mouse.move(1, 1)
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${out}/${phone ? 'phone-' : ''}${screen}-${scheme}.png` })
    if (errors.length) console.log(entry, scheme, errors.slice(0, 3))
    await page.close()
  }
}
await browser.close()
