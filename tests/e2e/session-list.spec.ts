import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { restStarted } from './rest-started'

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

const allExercises = (page: Page) => page.getByRole('button', { name: 'All exercises' }).click()

test('one row per exercise, each with set ticks and no values yet', async ({ page }) => {
  await expect(page.getByRole('listitem').filter({ has: page.getByRole('button', { name: /^(Bench press|Cable row|Lateral raise)/ }) })).toHaveCount(3)
  await expect(row(page, 'Bench press')).toContainText('—')
  await expect(row(page, 'Bench press').getByRole('img', { name: '0 of 1 sets done' })).toBeVisible()
})

test('the header shows the date and logged sets, the plan name as the title and Finish', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Push day')
  await expect(page.getByText(/ · 0 sets$/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Finish session' })).toBeDisabled()
  await expect(page.locator('input[type="date"]')).toHaveCount(0)

  await row(page, 'Bench press').click()
  await logSet(page, '60', '8')
  await allExercises(page)
  await expect(page.getByText(/ · 1 set$/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Finish session' })).toBeEnabled()
})

test('the first exercise with no logged set is the only inverted row, and it moves on as sets are logged', async ({ page }) => {
  await expect(page.locator('[aria-current="true"]')).toHaveCount(1)
  await expect(row(page, 'Bench press')).toHaveAttribute('aria-current', 'true')

  await row(page, 'Bench press').click()
  await logSet(page, '60', '8')
  await allExercises(page)

  await expect(row(page, 'Bench press')).toContainText('60 kg × 8')
  await expect(row(page, 'Bench press').getByRole('img', { name: '1 of 1 sets done' })).toBeVisible()
  await expect(row(page, 'Bench press')).not.toHaveAttribute('aria-current', 'true')
  await expect(row(page, 'Cable row')).toHaveAttribute('aria-current', 'true')
})

test('no row is inverted once every exercise has a logged set', async ({ page }) => {
  for (const name of ['Bench press', 'Cable row', 'Lateral raise']) {
    await row(page, name).click()
    await logSet(page, '20', '10')
    await allExercises(page)
  }
  await expect(page.locator('[aria-current="true"]')).toHaveCount(0)
})

test('rows are numbered and at least 44px; a row opens its exercise as a full screen', async ({ page }) => {
  const cable = row(page, 'Cable row')
  expect((await cable.boundingBox())?.height).toBeGreaterThanOrEqual(44)
  await expect(cable.locator('.list-row__number')).toHaveText('2')
  await expect(visibleInputs(page)).toHaveCount(0)

  await cable.click()
  const title = page.getByRole('heading', { level: 1 })
  await expect(title).toHaveText('Cable row')
  await expect(title).toBeFocused()
  const screen = page.getByRole('region', { name: 'Cable row' })
  await expect(screen.getByText('Set 1 of 1')).toBeVisible()
  await expect(screen.getByText('Push day · exercise 2 of 3')).toBeVisible()
  await expect(visibleInputs(page)).not.toHaveCount(0)
  // The list is gone while the exercise is open.
  await expect(row(page, 'Bench press')).toHaveCount(0)
})

test('All exercises returns to the list with focus on that row; Next opens the next exercise', async ({ page }) => {
  await row(page, 'Bench press').click()
  await page.getByRole('button', { name: 'Next exercise: Cable row' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cable row')
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused()

  await page.getByRole('button', { name: 'Next exercise: Lateral raise' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lateral raise')
  await expect(page.getByRole('button', { name: /^Next exercise/ })).toHaveCount(0)

  await allExercises(page)
  await expect(row(page, 'Lateral raise')).toBeFocused()
})

test('a rest keeps running on the list; the strip shows it and opens that exercise', async ({ page }) => {
  const strip = page.getByRole('button', { name: /^Rest/ })
  await expect(strip).toHaveCount(0)

  await row(page, 'Cable row').click()
  await logSet(page, '40', '10')
  await page.getByRole('button', { name: 'Set done' }).click()
  await expect(page.getByRole('timer', { name: /^Rest/ })).toBeVisible()
  // The exercise's own block shows its rest, so the strip stays off here.
  await expect(strip).toHaveCount(0)
  await allExercises(page)

  await expect(strip).toBeVisible()
  await expect(strip).toContainText('Cable row')
  expect((await strip.boundingBox())?.height).toBeGreaterThanOrEqual(44)

  await strip.click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cable row')
  await expect(page.getByRole('timer', { name: /^Rest/ })).toBeVisible()
})

test('the strip shows on another exercise while a rest runs', async ({ page }) => {
  await row(page, 'Bench press').click()
  await logSet(page, '60', '8')
  await page.getByRole('button', { name: 'Set done' }).click()
  await page.getByRole('button', { name: 'Next exercise: Cable row' }).click()
  await expect(page.getByRole('button', { name: /^Rest/ })).toContainText('Bench press')
})

test('a running rest survives a reload and still shows on the strip', async ({ page }) => {
  await row(page, 'Bench press').click()
  await logSet(page, '60', '8')
  await page.getByRole('button', { name: 'Set done' }).click()
  await restStarted(page)
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
  await allExercises(page)
  await expect(page.getByRole('button', { name: /^Rest/ })).toBeVisible()
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
})
