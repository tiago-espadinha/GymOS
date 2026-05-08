import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { finishButton, logSet } from './log-set'

const plan = {
  id: 'p1',
  name: 'Push day',
  desc: '',
  exercises: [
    { id: 'e1', name: 'Bench press', muscleGroup: 'Chest' },
    { id: 'e2', name: 'Overhead press', muscleGroup: 'Shoulders' },
  ],
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((p) => {
    if (!localStorage.getItem('gym:plans')) localStorage.setItem('gym:plans', JSON.stringify([p]))
  }, plan)
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Push day' }).click()
})

const logBench = async (page: Page) => {
  await page.getByRole('button', { name: /^Bench press/ }).click()
  await logSet(page, '60', '8')
  await page.getByRole('button', { name: 'All exercises' }).click()
}

test('Finish is disabled until a set is logged, and an empty session can be cancelled', async ({ page }) => {
  await expect(finishButton(page)).toBeDisabled()
  await expect(page.getByText('Log a set to finish.')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('heading', { name: 'Log', exact: true })).toBeVisible()
})

test('the Done screen totals the logged sets only', async ({ page }) => {
  await logBench(page)
  await finishButton(page).click()
  await expect(page.getByRole('heading', { name: 'Done' })).toBeFocused()
  const stats = page.locator('.finishStat')
  await expect(stats).toHaveText(['exercise1', 'set1', 'kg moved480'])
  await expect(page.locator('.finishRow')).toHaveCount(1)
  await expect(page.locator('.finishRow')).toContainText('1 × 60 kg × 8')
})

test('kg moved is left out when nothing was lifted', async ({ page }) => {
  await page.getByRole('button', { name: /^Bench press/ }).click()
  await logSet(page, '', '15')
  await page.getByRole('button', { name: 'All exercises' }).click()
  await finishButton(page).click()
  await expect(page.getByText('kg moved')).toHaveCount(0)
  await expect(page.locator('.finishStat')).toHaveText(['exercise1', 'set1'])
})

test('Back to logging keeps the logged set and the notes', async ({ page }) => {
  await logBench(page)
  await finishButton(page).click()
  await page.getByLabel('Notes · optional').fill('Felt strong')
  await page.getByRole('button', { name: 'Back to logging' }).click()
  await expect(finishButton(page)).toBeFocused()
  await finishButton(page).click()
  await expect(page.getByLabel('Notes · optional')).toHaveValue('Felt strong')
})

test('Save stores the trimmed notes and lands on Log home with the session in Recent', async ({ page }) => {
  await logBench(page)
  await finishButton(page).click()
  await page.getByLabel('Notes · optional').fill('  Felt strong  ')
  await page.getByRole('button', { name: 'Save session' }).click()
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Log', exact: true })).toBeVisible()
  await expect(page.getByText('Session saved')).toBeVisible()
  await expect(page.locator('.logHomeItem').first()).toContainText('Push day')
  await page.reload()
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('gym:sessions') ?? '[]'))
  expect(stored[0].notes).toBe('Felt strong')
  await expect(page.locator('.logHomeNotes').first()).toHaveText('Felt strong')
})

test('the Done screen passes the axe scan', async ({ page }) => {
  await logBench(page)
  await finishButton(page).click()
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
})
