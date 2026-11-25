import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { finishButton, logSet } from './log-set'

const plan = {
  id: 'p1',
  name: 'Push day',
  desc: '',
  exercises: [{ id: 'e1', name: 'Bench press', muscleGroup: 'Chest' }],
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((p) => {
    if (!localStorage.getItem('gym:plans')) localStorage.setItem('gym:plans', JSON.stringify([p]))
  }, plan)
})

const startPlan = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'Start Push day' }).click()

// The session opens on the exercise list; open the first exercise to log into it.
const openBench = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: /^Bench press/ }).click()

const tabBar = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Main' })

test('browse mode shows the tab bar with Plans, Log and Progress', async ({ page }) => {
  await page.goto('/')
  await expect(tabBar(page).getByRole('button')).toHaveText(['Plans', 'Log', 'Progress'])
  await tabBar(page).getByRole('button', { name: 'Progress' }).click()
  await expect(tabBar(page).getByRole('button', { name: 'Progress' })).toHaveAttribute('aria-current', 'page')
})

test('starting a plan hides the tabs; saving brings them back on Log', async ({ page }) => {
  await page.goto('/')
  await startPlan(page)
  await expect(tabBar(page)).toHaveCount(0)
  await openBench(page)
  await logSet(page, '60', '8')
  await page.getByRole('button', { name: 'All exercises' }).click()
  await finishButton(page).click()
  await page.getByRole('button', { name: 'Save session' }).click()
  await expect(tabBar(page)).toBeVisible()
  await expect(tabBar(page).getByRole('button', { name: 'Log' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText('Session saved')).toBeVisible()
})

test('cancelling an empty session brings the tabs back', async ({ page }) => {
  await page.goto('/')
  await startPlan(page)
  await expect(tabBar(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(tabBar(page)).toBeVisible()
})

test('reloading mid-session restores the session and its logged set', async ({ page }) => {
  await page.goto('/')
  await startPlan(page)
  await openBench(page)
  await logSet(page, '62.5', '8')
  await page.getByRole('button', { name: 'End rest' }).click()
  await page.reload()
  await expect(tabBar(page)).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Push day' })).toBeVisible()
  await openBench(page)
  await expect(page.getByRole('list', { name: 'Sets' }).getByRole('listitem').first()).toContainText('62.5 kg × 8')
})

test('a corrupt stored session starts in browse mode', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('gym:activeSession', '{"planId":'))
  await page.goto('/')
  await expect(tabBar(page)).toBeVisible()
})

test('session mode has no detectable WCAG A/AA violations', async ({ page }) => {
  await page.goto('/')
  await startPlan(page)
  await expect(tabBar(page)).toHaveCount(0)
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
})

test('editing a saved session updates it in place, also after a reload', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('gym:sessions')) return
    localStorage.setItem('gym:sessions', JSON.stringify([{
      id: 's1', planId: 'p1', planName: 'Push day', date: '2026-11-10', notes: '',
      exercises: [{ id: 'e1', name: 'Bench press', muscleGroup: 'Chest', sets: [{ id: 'x', weight: '50', reps: '5' }] }],
    }]))
  })
  await page.goto('/')
  await tabBar(page).getByRole('button', { name: 'Log' }).click()
  await page.getByRole('button', { name: 'Edit' }).click()
  await expect(tabBar(page)).toHaveCount(0)
  await page.reload()
  await openBench(page)
  await page.getByRole('button', { name: 'Edit set 1' }).click()
  await page.getByRole('textbox', { name: 'Weight', exact: true }).fill('55')
  await page.getByRole('button', { name: 'Save set 1' }).click()
  await page.getByRole('button', { name: 'All exercises' }).click()
  await finishButton(page).click()
  await page.getByRole('button', { name: 'Update session' }).click()
  await expect(tabBar(page)).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Push day session updated' })).toHaveCount(1)
  await expect(page.getByRole('listitem').first()).toContainText('Just updatedPush day')
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('gym:sessions') ?? '[]'))
  expect(stored).toHaveLength(1)
  expect(stored[0].id).toBe('s1')
  expect(stored[0].exercises[0].sets[0].weight).toBe('55')
})

test('cancelling a session with logged sets asks first', async ({ page }) => {
  await page.goto('/')
  await startPlan(page)
  await openBench(page)
  await logSet(page, '60', '8')
  await page.getByRole('button', { name: 'All exercises' }).click()
  await finishButton(page).click()
  page.once('dialog', (d) => d.dismiss())
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(tabBar(page)).toHaveCount(0)
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(tabBar(page)).toBeVisible()
})

test('focus moves to the title when a session starts and ends', async ({ page }) => {
  await page.goto('/')
  await startPlan(page)
  await expect(page.getByRole('heading', { name: 'Push day' })).toBeFocused()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('heading', { name: 'Log', exact: true })).toBeFocused()
})
