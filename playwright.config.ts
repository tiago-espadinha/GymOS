import { defineConfig, devices } from '@playwright/test'

// Set E2E_PORT when another server already holds 4173.
const port = Number(process.env.E2E_PORT ?? 4173)
const origin = `http://localhost:${port}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: origin,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
    // The timer specs again at desktop width, where the session splits around the timer.
    {
      name: 'wide-chromium',
      testMatch: /(rest-timer|timed-set|rest-cleanup)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${port} --strictPort`,
    url: origin,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
