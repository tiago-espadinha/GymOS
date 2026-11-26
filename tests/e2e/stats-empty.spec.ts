import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const plan = { id: 'p1', name: 'Pull day', desc: '', exercises: [{ id: 'e1', name: 'Lat pulldown', muscleGroup: 'Back' }] }

const openStats = async (page: Page, plans: unknown[]) => {
  await page.addInitScript((p) => {
    localStorage.setItem('gym:plans', JSON.stringify(p))
    localStorage.setItem('gym:sessions', '[]')
  }, plans)
  await page.goto('/')
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Stats' }).click()
}

const violations = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations.map(
    (v) => `${v.id} (${v.nodes.length})`,
  )

for (const width of [375, 768, 1280]) {
  test(`with no data Stats shows the empty block and Import, with no Settings pill, at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await openStats(page, [])
    await expect(page.getByRole('heading', { name: 'Stats', level: 1 })).toBeAttached()
    await expect(page.getByRole('heading', { name: 'No stats yet' })).toBeVisible()
    await expect(page.locator('.mainContent').getByRole('button', { name: 'Settings' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Have a CSV backup? Import it' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    expect(await violations(page)).toEqual([])
  })
}

test('with no data, New plan opens the new-plan form and Import opens the Settings tab and the file picker', async ({ page }) => {
  await openStats(page, [])
  await page.getByRole('button', { name: 'New plan' }).click()
  await expect(page.getByPlaceholder('e.g. Push Day')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Stats' }).click()
  await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Have a CSV backup? Import it' }).click()])
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Settings' })).toHaveAttribute('aria-current', 'page')
})

test('with a plan but no sessions, Go to Log opens Log and there is no Import', async ({ page }) => {
  await openStats(page, [plan])
  await expect(page.getByRole('heading', { name: 'No stats yet' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Exercise: / })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Have a CSV backup? Import it' })).toHaveCount(0)
  expect(await violations(page)).toEqual([])
  await page.getByRole('button', { name: 'Go to Log' }).click()
  await expect(page.getByRole('button', { name: 'Log', exact: true })).toHaveAttribute('aria-current', 'page')
})
