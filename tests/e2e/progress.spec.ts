import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)

const plan = {
  id: 'p1',
  name: 'Pull day',
  desc: '',
  exercises: [
    { id: 'e1', name: 'Lat pulldown', muscleGroup: 'Back' },
    { id: 'e2', name: 'Plank', muscleGroup: 'Core', category: 'calisthenics', trackingType: 'time' },
    { id: 'e3', name: 'Row', muscleGroup: 'Back' },
  ],
}

const session = (ago: number, name: string, weight: string, reps: string) => ({
  id: `${name}-${ago}`,
  planId: 'p1',
  planName: 'Pull day',
  date: daysAgo(ago),
  notes: '',
  exercises: [{ id: 'x', name, muscleGroup: 'Back', sets: [{ id: 's', weight, reps, completed: true }] }],
})

const sessions = [
  session(200, 'Lat pulldown', '50', '10'),
  session(150, 'Lat pulldown', '57', '8'),
  session(80, 'Lat pulldown', '30', '10'),
  session(60, 'Lat pulldown', '35', '10'),
  session(20, 'Lat pulldown', '30', '12'),
  session(5, 'Lat pulldown', '40', '12'),
  session(200, 'Row', '60', '10'),
]

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ([p, s]) => {
      localStorage.setItem('gym:plans', JSON.stringify([p]))
      localStorage.setItem('gym:sessions', JSON.stringify(s))
    },
    [plan, sessions] as const,
  )
  await page.goto('/')
  await page.getByText('Progress', { exact: true }).first().click()
})

const figures = (page: Page) => page.locator('.progressStatValue')
const caption = (page: Page) => page.locator('.progressCaption')
const range = (page: Page, name: string) =>
  page.getByRole('group', { name: 'Time range' }).getByRole('button', { name, exact: true })

test('shows last and best for the chosen metric', async ({ page }) => {
  await expect(page.getByLabel('Exercise')).toHaveValue('Lat pulldown')
  await expect(figures(page)).toHaveText(['40.0kg/rep', '57.0kg/rep'])
  await page.getByRole('group', { name: 'Metric' }).getByRole('button', { name: 'Peak' }).click()
  await expect(figures(page)).toHaveText(['40kg × 12', '57kg × 8'])
  await expect(page.locator('.progressStatKicker').nth(0)).toContainText('Last ·')
  await expect(page.getByRole('group', { name: 'Metric' }).getByRole('button')).toHaveCount(4)
})

test('ranges narrow the chart and keep last and best', async ({ page }) => {
  await expect(caption(page)).toContainText('6 sessions')
  await expect(page.locator('.progressChart circle[fill="var(--color-accent)"]')).toHaveCount(1)
  for (const [name, text] of [['5S', 'last 5 of 6'], ['10S', '6 sessions'], ['1M', 'last 2 of 6'], ['3M', 'last 4 of 6']]) {
    await range(page, name).click()
    await expect(range(page, name)).toHaveAttribute('aria-pressed', 'true')
    await expect(caption(page)).toContainText(text)
  }
  await expect(figures(page)).toHaveText(['40.0kg/rep', '57.0kg/rep'])
  await expect(page.locator('.progressAnalysis')).toContainText('Lat pulldown tracked across 4 sessions.')
})

test('ranges with no sessions are disabled and fall back to All', async ({ page }) => {
  await range(page, '1M').click()
  await page.getByLabel('Exercise').selectOption('Row')
  await expect(range(page, '1M')).toBeDisabled()
  await expect(range(page, '3M')).toBeDisabled()
  await expect(range(page, 'All')).toHaveAttribute('aria-pressed', 'true')
  await expect(caption(page).locator('span').nth(1)).toHaveText('1 session')
})

test('an exercise without sessions shows the empty state and three metrics', async ({ page }) => {
  await page.getByLabel('Exercise').selectOption('Plank')
  await expect(page.getByText('No sessions yet for this exercise')).toBeVisible()
  await expect(page.locator('.progressChart')).toHaveCount(0)
  await expect(page.getByRole('group', { name: 'Metric' }).getByRole('button')).toHaveText(['Average', 'Peak', 'Total'])
})

test('Import / export reveals the existing data tools', async ({ page }) => {
  const toggle = page.getByRole('button', { name: 'Import / export' })
  await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeHidden()
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Import CSV' })).toBeVisible()
})

test('Progress with data has no detectable WCAG A/AA violations', async ({ page }) => {
  await page.getByRole('button', { name: 'Import / export' }).click()
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
})
