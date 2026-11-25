import { expect, test } from '@playwright/test'

test('app loads and shows the main navigation', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Plans').first()).toBeVisible()
  await expect(page.getByText('Log').first()).toBeVisible()
  await expect(page.getByText('Stats').first()).toBeVisible()
})
