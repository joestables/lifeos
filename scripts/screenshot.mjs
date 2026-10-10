// Screenshots a page in dark and light, at desktop and phone width, for
// pull requests (docs/30-design/README.md, step 8). Usage:
//   node scripts/screenshot.mjs <url> <output prefix> [button names to open…]
// With SIGNED_IN=<supabase project ref>, the page sees a stand-in session for
// a made-up person, so signed-in pages show without real data.
import { chromium } from '@playwright/test'

const [url, out, ...open] = process.argv.slice(2)
const standIn = process.env.SIGNED_IN && {
  key: `sb-${process.env.SIGNED_IN}-auth-token`,
  session: {
    access_token: 'stand-in',
    refresh_token: 'stand-in',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: '00000000-0000-4000-8000-00000000000a',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'ann@example.com',
      app_metadata: { provider: 'google' },
      user_metadata: { full_name: 'Ann Example' },
      created_at: '2026-10-09T00:00:00Z',
    },
  },
}
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
})
for (const colorScheme of ['dark', 'light']) {
  for (const [width, height, tag] of [
    [1280, 900, 'desktop'],
    [390, 844, 'phone'],
  ]) {
    const page = await browser.newPage({ colorScheme, viewport: { width, height } })
    if (standIn)
      await page.addInitScript(
        ([key, value]) => localStorage.setItem(key, value),
        [standIn.key, JSON.stringify(standIn.session)],
      )
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
