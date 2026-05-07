import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const tabs = ['Plans', 'Log', 'Progress']

for (const tab of tabs) {
  test(`${tab} tab has no detectable WCAG A/AA violations`, async ({ page }) => {
    await page.goto('/')
    await page.getByText(tab, { exact: true }).first().click()
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
  })
}
