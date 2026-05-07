import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

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
  page.getByRole('button', { name: 'Log', exact: true }).first().click() // the plan card's button precedes the tab bar

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
  await page.getByPlaceholder('0').nth(0).fill('60')
  await page.getByPlaceholder('0').nth(1).fill('8')
  await page.getByRole('button', { name: 'Save Session' }).click()
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
  await page.getByPlaceholder('0').nth(0).fill('62.5')
  await page.reload()
  await expect(tabBar(page)).toHaveCount(0)
  await expect(page.getByText('Push day')).toBeVisible()
  await expect(page.getByPlaceholder('0').nth(0)).toHaveValue('62.5')
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
