import { expect, test, type Page } from '@playwright/test'

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
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Push day' }).click()
  await page.getByRole('button', { name: /^Bench press/ }).click()
})

const timer = (page: Page) => page.getByRole('timer', { name: /^Rest/ })

const logAndRest = async (page: Page) => {
  const inputs = page.locator('input[placeholder="0"]:visible')
  await inputs.nth(0).fill('60')
  await inputs.nth(1).fill('8')
  await page.getByRole('button', { name: 'Set done' }).click()
}

test('saving a session clears its rests, so editing it later shows none', async ({ page }) => {
  await logAndRest(page)
  await page.getByRole('button', { name: 'Save Session' }).click()
  await page.getByRole('button', { name: /^Edit/ }).first().click()
  await expect(page.getByRole('button', { name: /^Rest/ })).toHaveCount(0)
  await page.getByRole('button', { name: /^Bench press/ }).click()
  await expect(timer(page)).toHaveCount(0)
})

test('cancelling a session clears its rests', async ({ page }) => {
  await logAndRest(page)
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Cancel' }).click()
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.endsWith('-rest')))
  expect(keys).toEqual([])
})
