import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const plans = [
  { id: 'p1', name: 'Push day', desc: 'Chest', exercises: [{ id: 'e1', name: 'Bench press', muscleGroup: 'Chest' }] },
  { id: 'p2', name: 'Old block', desc: '', isArchived: true, exercises: [{ id: 'e2', name: 'Curl', muscleGroup: 'Biceps' }] },
]

const tabs = ['Plans', 'Log', 'Progress']

for (const tab of tabs) {
  test(`${tab} tab has no detectable WCAG A/AA violations`, async ({ page }) => {
    // Only the Plans scan needs data; the other tabs keep their original empty-state scan.
    if (tab === 'Plans') await page.addInitScript((p) => localStorage.setItem('gym:plans', JSON.stringify(p)), plans)
    await page.goto('/')
    await page.getByText(tab, { exact: true }).first().click()
    if (tab === 'Plans') await page.getByRole('button', { name: /Show archived/ }).click()
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
  })
}
