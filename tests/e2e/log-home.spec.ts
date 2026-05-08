import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const plans = [
  { id: 'p1', name: 'Push day', desc: '', exercises: [{ id: 'e1', name: 'Bench press', muscleGroup: 'Chest' }] },
  { id: 'p2', name: 'Old block', desc: '', isArchived: true, exercises: [{ id: 'e2', name: 'Curl', muscleGroup: 'Biceps' }] },
]

// Newest first, as the app stores them. Eight sessions so the cap of six is visible.
const sessions = Array.from({ length: 8 }, (_, i) => ({
  id: `s${i}`,
  planId: 'p1',
  planName: `Session ${i}`,
  date: `2026-11-${String(16 - i).padStart(2, '0')}`,
  notes: i === 0 ? 'Felt strong, new bench PR' : '',
  exercises: [
    {
      id: 'e1',
      name: 'Bench press',
      muscleGroup: 'Chest',
      sets: [
        { id: 'a', weight: '60', reps: '10' },
        { id: 'b', weight: '60', reps: '8' },
      ],
    },
  ],
}))

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ([p, s]) => {
      if (localStorage.getItem('gym:plans')) return
      localStorage.setItem('gym:plans', JSON.stringify(p))
      localStorage.setItem('gym:sessions', JSON.stringify(s))
    },
    [plans, sessions],
  )
})

const openLog = async (page: Page) => {
  await page.goto('/')
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Log' }).click()
}

test('Start stays off until a plan is chosen, then starts it on the chosen date', async ({ page }) => {
  await openLog(page)
  const start = page.getByRole('button', { name: 'Start', exact: true })
  await expect(start).toBeDisabled()
  await page.getByLabel('Training plan').selectOption({ label: 'Push day' })
  await page.getByLabel('Date').fill('2026-11-01')
  await start.click()
  await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0)
  await expect(page.getByLabel('Session date')).toHaveValue('2026-11-01')
  await expect(page.getByText('Push day')).toBeVisible()
})

test('the plan list offers active plans only', async ({ page }) => {
  await openLog(page)
  await expect(page.getByLabel('Training plan').getByRole('option')).toHaveText(['Select a plan...', 'Push day'])
})

test('Recent shows the six newest sessions with sets, volume and notes', async ({ page }) => {
  await openLog(page)
  const rows = page.getByRole('region', { name: 'Recent sessions' }).getByRole('listitem')
  await expect(rows).toHaveCount(6)
  await expect(rows.first()).toContainText('Session 0')
  await expect(rows.first()).toContainText('2 sets · 1080 kg')
  await expect(rows.first()).toContainText('Felt strong, new bench PR')
  await expect(rows.last()).toContainText('Session 5')
})

test('Edit opens the saved session and is at least 44px tall', async ({ page }) => {
  await openLog(page)
  const edit = page.getByRole('button', { name: /^Edit Session 0/ })
  expect((await edit.boundingBox())?.height).toBeGreaterThanOrEqual(44)
  await edit.click()
  await expect(page.getByRole('heading', { name: 'Edit Session' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Finish session' })).toBeVisible()
})

test('Delete removes a session after confirming and the next one fills the list', async ({ page }) => {
  await openLog(page)
  const rows = page.getByRole('region', { name: 'Recent sessions' }).getByRole('listitem')
  const del = page.getByRole('button', { name: /^Delete Session 0/ })
  expect((await del.boundingBox())?.height).toBeGreaterThanOrEqual(44)
  page.once('dialog', (d) => d.dismiss())
  await del.click()
  await expect(rows.first()).toContainText('Session 0')
  page.once('dialog', (d) => d.accept())
  await del.click()
  await expect(rows).toHaveCount(6)
  await expect(rows.first()).toContainText('Session 1')
  await expect(rows.last()).toContainText('Session 6')
})

test('Log home has no detectable WCAG A/AA violations with plans and sessions', async ({ page }) => {
  await openLog(page)
  await expect(page.getByRole('heading', { name: 'Recent sessions' })).toBeVisible()
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
})
