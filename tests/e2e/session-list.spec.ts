import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { finishButton, logSet } from './log-set'
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

// Cable row was last done on 8 Nov; an older session must not win.
const history = [
  {
    id: 's2', planId: 'p1', planName: 'Push day', date: '2026-11-08', notes: '',
    exercises: [{ id: 'e2', name: 'Cable row', muscleGroup: 'Back', sets: [
      { id: 'a', weight: '35', reps: '12' }, { id: 'b', weight: '35', reps: '12' }, { id: 'c', weight: '35', reps: '10' },
    ] }],
  },
  {
    id: 's1', planId: 'p1', planName: 'Push day', date: '2026-11-01', notes: '',
    exercises: [{ id: 'e2', name: 'Cable row', muscleGroup: 'Back', sets: [{ id: 'd', weight: '30', reps: '12' }] }],
  },
]

test.beforeEach(async ({ page }) => {
  await page.addInitScript(([p, h]) => {
    if (!localStorage.getItem('gym:plans')) localStorage.setItem('gym:plans', JSON.stringify([p]))
    if (!localStorage.getItem('gym:sessions')) localStorage.setItem('gym:sessions', JSON.stringify(h))
  }, [plan, history] as const)
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Push day' }).click()
})

const row = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(`^${name}`) })
const strip = (page: Page) => page.getByRole('button', { name: /^Rest/ })
const sets = (page: Page) => page.getByRole('list', { name: 'Sets' }).getByRole('listitem')
const weight = (page: Page) => page.getByRole('textbox', { name: 'Weight', exact: true })
const reps = (page: Page) => page.getByRole('textbox', { name: 'Reps', exact: true })
const allExercises = (page: Page) => page.getByRole('button', { name: 'All exercises' }).click()

const axe = async (page: Page) => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
}

test('one row per exercise with ticks, and last time or "Not logged recently" before anything is logged', async ({ page }) => {
  await expect(page.getByRole('listitem').filter({ has: page.getByRole('button', { name: /^(Bench press|Cable row|Lateral raise)/ }) })).toHaveCount(3)
  await expect(row(page, 'Bench press')).toContainText('Not logged recently')
  await expect(row(page, 'Cable row')).toContainText('Last 35 kg × 12')
  await expect(row(page, 'Bench press').getByRole('img', { name: '0 of 1 sets done' })).toBeVisible()
})

test('the header shows the date and logged sets, the plan name as the title and Finish', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Push day')
  await expect(page.getByText(/ · 0 sets$/)).toBeVisible()
  await expect(finishButton(page)).toBeDisabled()
  await expect(page.getByLabel('Another day')).toHaveCount(0)

  await row(page, 'Bench press').click()
  await logSet(page, '60', '8')
  await allExercises(page)
  await expect(page.getByText(/ · 1 set$/)).toBeVisible()
  await expect(finishButton(page)).toBeEnabled()
})

test('the first exercise with no logged set is the only inverted row, and it moves on as sets are logged', async ({ page }) => {
  await expect(page.locator('[aria-current="true"]')).toHaveCount(1)
  await expect(row(page, 'Bench press')).toHaveAttribute('aria-current', 'true')

  await row(page, 'Bench press').click()
  await logSet(page, '60', '8')
  await allExercises(page)

  await expect(row(page, 'Bench press')).toContainText('60 kg × 8 · done')
  await expect(row(page, 'Bench press').getByRole('img', { name: '1 of 1 sets done' })).toBeVisible()
  await expect(row(page, 'Bench press')).not.toHaveAttribute('aria-current', 'true')
  await expect(row(page, 'Cable row')).toHaveAttribute('aria-current', 'true')
})

test('with no rest running the strip is hidden, also after a rest is skipped', async ({ page }) => {
  await expect(strip(page)).toHaveCount(0)
  await row(page, 'Bench press').click()
  await logSet(page, '60', '8')
  await page.getByRole('button', { name: 'End rest' }).click()
  await allExercises(page)
  await expect(strip(page)).toHaveCount(0)
})

test('once every exercise has a logged set: filled Finish, an "All 3 exercises done" status and a Finish session bar', async ({ page }) => {
  await expect(page.getByText('All 3 exercises done')).toHaveCount(0)
  for (const name of ['Bench press', 'Cable row', 'Lateral raise']) {
    await row(page, name).click()
    await logSet(page, '20', '10')
    await allExercises(page)
  }
  await expect(page.locator('[aria-current="true"]')).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'All 3 exercises done' })).toBeVisible()
  await expect(page.locator('#logTabFinish')).toHaveClass(/pill-button--white/)
  const bar = page.getByRole('button', { name: 'Finish session' }).last()
  expect((await bar.boundingBox())?.height).toBeGreaterThanOrEqual(72)
  await bar.click()
  await expect(page.getByRole('heading', { name: 'Done' })).toBeVisible()
})

test('the all-done list has no detectable WCAG A/AA violations', async ({ page }) => {
  for (const name of ['Bench press', 'Cable row', 'Lateral raise']) {
    await row(page, name).click()
    await logSet(page, '20', '10')
    await page.getByRole('button', { name: 'End rest' }).click()
    await allExercises(page)
  }
  await expect(page.getByText('All 3 exercises done')).toBeVisible()
  await axe(page)
})

test('the exercise screen shows last time and seeds the steppers from it, then from the last logged set', async ({ page }) => {
  await row(page, 'Cable row').click()
  await expect(page.getByText('Last time 35 kg × 12, 12, 10')).toBeVisible()
  await expect(weight(page)).toHaveValue('35')
  await expect(reps(page)).toHaveValue('12')

  await page.getByRole('button', { name: 'Increase Weight' }).click()
  await page.getByRole('button', { name: 'Decrease Reps' }).click()
  await expect(weight(page)).toHaveValue('37.5')
  await expect(reps(page)).toHaveValue('11')
  await page.getByRole('button', { name: 'Set done' }).click()
  await expect(page.getByRole('timer', { name: /^Rest/ })).toBeVisible()
  await page.getByRole('button', { name: 'End rest' }).click()

  await expect(sets(page).first()).toContainText('37.5 kg × 11')
  await expect(sets(page).nth(1)).toContainText('Now')
  await expect(weight(page)).toHaveValue('37.5')
})

test('typed values are accepted, and a comma reads as a decimal point', async ({ page }) => {
  await row(page, 'Bench press').click()
  await expect(page.getByRole('button', { name: 'Set done' })).toBeDisabled()
  await weight(page).fill('62,5')
  await expect(weight(page)).toHaveValue('62.5')
  await reps(page).fill('8x')
  await expect(reps(page)).toHaveValue('8')
  await page.getByRole('button', { name: 'Set done' }).click()
  await page.getByRole('button', { name: 'End rest' }).click()
  await expect(sets(page).first()).toContainText('62.5 kg × 8')
})

test('Set done keeps adding sets; there is no Add set button', async ({ page }) => {
  await row(page, 'Bench press').click()
  await expect(page.getByRole('button', { name: /Add set/ })).toHaveCount(0)
  await logSet(page, '60', '8')
  await page.getByRole('button', { name: 'End rest' }).click()
  await logSet(page, '60', '6')
  await page.getByRole('button', { name: 'End rest' }).click()
  await expect(sets(page)).toHaveCount(3)
  await expect(sets(page).nth(1)).toContainText('60 kg × 6')
})

test('editing a done set changes it, Finish totals follow and it survives a reload', async ({ page }) => {
  await row(page, 'Bench press').click()
  await logSet(page, '60', '8')
  await page.getByRole('button', { name: 'End rest' }).click()

  await page.getByRole('button', { name: 'Edit set 1' }).click()
  await expect(page.getByText('Edit set 1')).toBeVisible()
  await expect(weight(page)).toBeFocused()
  await weight(page).fill('62.5')
  await reps(page).fill('10')
  await expect(sets(page).first()).toContainText('60 kg × 8 → 62.5 kg × 10')
  await expect(sets(page).first()).toContainText('Editing')
  await page.getByRole('button', { name: 'Save set 1' }).click()
  await expect(page.getByRole('button', { name: 'Edit set 1' })).toBeFocused()
  await expect(sets(page).first()).toContainText('62.5 kg × 10')

  await page.reload()
  await row(page, 'Bench press').click()
  await expect(sets(page).first()).toContainText('62.5 kg × 10')
  await allExercises(page)
  await finishButton(page).click()
  await expect(page.locator('.finishStat')).toHaveText(['exercise1', 'set1', 'kg moved625'])
})

test('Cancel leaves a done set unchanged; Delete set removes it', async ({ page }) => {
  await row(page, 'Bench press').click()
  await logSet(page, '60', '8')
  await page.getByRole('button', { name: 'End rest' }).click()
  await logSet(page, '65', '6')
  await page.getByRole('button', { name: 'End rest' }).click()

  await page.getByRole('button', { name: 'Edit set 1' }).click()
  await weight(page).fill('100')
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(sets(page).first()).toContainText('60 kg × 8')

  await page.getByRole('button', { name: 'Edit set 1' }).click()
  await page.getByRole('button', { name: 'Delete set 1' }).click()
  await expect(sets(page)).toHaveCount(2)
  await expect(sets(page).first()).toContainText('65 kg × 6')
})

test('the edit state has no detectable WCAG A/AA violations', async ({ page }) => {
  await row(page, 'Bench press').click()
  await logSet(page, '60', '8')
  await page.getByRole('button', { name: 'End rest' }).click()
  await page.getByRole('button', { name: 'Edit set 1' }).click()
  await axe(page)
})

test('rows are numbered and at least 44px; a row opens its exercise as a full screen', async ({ page }) => {
  const cable = row(page, 'Cable row')
  expect((await cable.boundingBox())?.height).toBeGreaterThanOrEqual(44)
  await expect(cable.locator('.list-row__number')).toHaveText('2')
  await expect(weight(page)).toHaveCount(0)

  await cable.click()
  const title = page.getByRole('heading', { level: 1 })
  await expect(title).toHaveText('Cable row')
  await expect(title).toBeFocused()
  const screen = page.getByRole('region', { name: 'Cable row' })
  await expect(screen.getByText('Set 1 of 1')).toBeVisible()
  await expect(screen.getByText('Push day · exercise 2 of 3')).toBeVisible()
  await expect(weight(page)).toBeVisible()
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
  await expect(strip(page)).toHaveCount(0)

  await row(page, 'Cable row').click()
  await logSet(page, '40', '10')
  await expect(page.getByRole('timer', { name: /^Rest/ })).toBeVisible()
  await expect(page.getByText('Next · Set 2 of 2')).toBeVisible()
  // The exercise's own block shows its rest, so the strip stays off here.
  await expect(strip(page)).toHaveCount(0)
  await allExercises(page)

  await expect(strip(page)).toBeVisible()
  await expect(strip(page)).toContainText('Cable row')
  expect((await strip(page).boundingBox())?.height).toBeGreaterThanOrEqual(44)

  await strip(page).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cable row')
  await expect(page.getByRole('timer', { name: /^Rest/ })).toBeVisible()
})

test('the strip shows on another exercise while a rest runs', async ({ page }) => {
  await row(page, 'Bench press').click()
  await logSet(page, '60', '8')
  await page.getByRole('button', { name: 'Next exercise: Cable row' }).click()
  await expect(strip(page)).toContainText('Bench press')
})

test('a running rest survives a reload and still shows on the strip', async ({ page }) => {
  await row(page, 'Bench press').click()
  await logSet(page, '60', '8')
  await restStarted(page)
  await page.reload()
  await expect(strip(page)).toContainText('Bench press')
  await strip(page).click()
  await expect(page.getByRole('timer', { name: /^Rest/ })).toBeVisible()
})

test('the session list has no detectable WCAG A/AA violations, with a rest running', async ({ page }) => {
  await row(page, 'Bench press').click()
  await logSet(page, '60', '8')
  await expect(page.getByRole('timer', { name: /^Rest/ })).toBeVisible()
  await allExercises(page)
  await expect(strip(page)).toBeVisible()
  await axe(page)
})
