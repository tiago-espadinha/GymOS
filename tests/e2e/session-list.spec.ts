import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const plan = {
  id: 'p1',
  name: 'Push day',
  desc: '',
  exercises: [
    { id: 'e1', name: 'Bench press', muscleGroup: 'Chest' },
    { id: 'e2', name: 'Cable row', muscleGroup: 'Back' },
    { id: 'e3', name: 'Lateral raise', muscleGroup: 'Shoulders' },
  ],
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((p) => {
    if (!localStorage.getItem('gym:plans')) localStorage.setItem('gym:plans', JSON.stringify([p]))
  }, plan)
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Push day' }).click()
})

const row = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(`^${name}`) })

// Only the opened exercise's inputs are visible; the others stay mounted but hidden.
const visibleInputs = (page: Page) => page.locator('input[placeholder="0"]:visible')

const logSet = async (page: Page, weight: string, reps: string) => {
  await visibleInputs(page).nth(0).fill(weight)
  await visibleInputs(page).nth(1).fill(reps)
}

test('one row per exercise, each with set ticks and no values yet', async ({ page }) => {
  await expect(page.getByRole('listitem').filter({ has: page.getByRole('button', { name: /^(Bench press|Cable row|Lateral raise)/ }) })).toHaveCount(3)
  await expect(row(page, 'Bench press')).toContainText('—')
  await expect(row(page, 'Bench press').getByRole('img', { name: '0 of 1 sets done' })).toBeVisible()
})

test('the first exercise with no logged set is the only inverted row, and it moves on as sets are logged', async ({ page }) => {
  await expect(page.locator('[aria-current="true"]')).toHaveCount(1)
  await expect(row(page, 'Bench press')).toHaveAttribute('aria-current', 'true')

  await row(page, 'Bench press').click()
  await logSet(page, '60', '8')

  await expect(row(page, 'Bench press')).toContainText('60 kg × 8')
  await expect(row(page, 'Bench press').getByRole('img', { name: '1 of 1 sets done' })).toBeVisible()
  await expect(row(page, 'Bench press')).not.toHaveAttribute('aria-current', 'true')
  await expect(row(page, 'Cable row')).toHaveAttribute('aria-current', 'true')
})

test('no row is inverted once every exercise has a logged set', async ({ page }) => {
  for (const name of ['Bench press', 'Cable row', 'Lateral raise']) {
    await row(page, name).click()
    await logSet(page, '20', '10')
    await row(page, name).click()
  }
  await expect(page.locator('[aria-current="true"]')).toHaveCount(0)
})

test('a row opens its logger and a second tap closes it; rows are at least 44px', async ({ page }) => {
  const bench = row(page, 'Bench press')
  expect((await bench.boundingBox())?.height).toBeGreaterThanOrEqual(44)
  await expect(visibleInputs(page)).toHaveCount(0)
  await bench.click()
  await expect(bench).toHaveAttribute('aria-expanded', 'true')
  await expect(visibleInputs(page)).not.toHaveCount(0)
  await bench.click()
  await expect(visibleInputs(page)).toHaveCount(0)
})

test('the rest strip is absent until a rest runs, then shows it and opens that exercise', async ({ page }) => {
  const strip = page.getByRole('button', { name: /^Rest/ })
  await expect(strip).toHaveCount(0)

  await row(page, 'Cable row').click()
  await logSet(page, '40', '10')
  await page.getByRole('button', { name: 'Set done' }).click()
  await row(page, 'Cable row').click()

  await expect(strip).toBeVisible()
  await expect(strip).toContainText('Cable row')
  expect((await strip.boundingBox())?.height).toBeGreaterThanOrEqual(44)
  await expect(visibleInputs(page)).toHaveCount(0)

  await strip.click()
  await expect(row(page, 'Cable row')).toHaveAttribute('aria-expanded', 'true')
  await expect(visibleInputs(page)).not.toHaveCount(0)
})

test('a running rest survives a reload and still shows on the strip', async ({ page }) => {
  await row(page, 'Bench press').click()
  await logSet(page, '60', '8')
  await page.getByRole('button', { name: 'Set done' }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: /^Rest/ })).toContainText('Bench press')
  await page.getByRole('button', { name: /^Rest/ }).click()
  await expect(page.getByRole('timer', { name: /^Rest/ })).toBeVisible()
})

test('the session list has no detectable WCAG A/AA violations, with a rest running', async ({ page }) => {
  await row(page, 'Bench press').click()
  await logSet(page, '60', '8')
  await page.getByRole('button', { name: 'Set done' }).click()
  await expect(page.getByRole('timer', { name: /^Rest/ })).toBeVisible()
  await row(page, 'Bench press').click()
  await expect(page.getByRole('button', { name: /^Rest/ })).toBeVisible()
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
})
