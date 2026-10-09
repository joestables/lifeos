import { defineConfig, devices } from '@playwright/test'

/**
 * Browser tests against the built app and a stand-in Supabase
 * (tests/e2e/stand-in.ts) — never real data (docs/40-operations/environments.md).
 * Build first with the stand-in's values: npm run build:e2e.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}-{projectName}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixels: 100, threshold: 0.02, animations: 'disabled' } },
  use: { baseURL: 'http://localhost:4174' },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npx vite preview --port 4174 --strictPort',
    port: 4174,
    reuseExistingServer: !process.env.CI,
  },
})
