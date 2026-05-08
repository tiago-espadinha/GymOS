import { expect, test } from '@playwright/test'

const longName = 'Upper body hypertrophy block A'.padEnd(40, 'x')
const plans = [
  {
    id: 'p1',
    name: 'Push day',
    desc: '',
    exercises: [
      { id: 'e1', name: 'Bench press', muscleGroup: 'Chest' },
      { id: 'e2', name: 'Row', muscleGroup: 'Back' },
      { id: 'e3', name: 'Fly', muscleGroup: 'Chest' },
    ],
  },
  { id: 'p2', name: longName, desc: '', exercises: [{ id: 'e4', name: 'Squat', muscleGroup: 'Legs' }] },
  { id: 'p3', name: 'Old block', desc: '', isArchived: true, exercises: [{ id: 'e5', name: 'Curl', muscleGroup: 'Biceps' }] },
]

test.beforeEach(async ({ page }) => {
  await page.addInitScript((p) => {
    if (!localStorage.getItem('gym:plans')) localStorage.setItem('gym:plans', JSON.stringify(p))
  }, plans)
})

const tabBar = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Main' })

test('a plan card shows its exercise count and each muscle group once', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('3 exercises · Chest, Back')).toBeVisible()
  await expect(page.getByText('1 exercise · Legs')).toBeVisible()
})

test('Start opens the session for that plan, and a reload restores it', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Push day' }).click()
  await expect(tabBar(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Bench press/ })).toBeVisible()
  await expect(page.locator('input[type="date"]')).toHaveValue(new Date().toISOString().slice(0, 10))
  await page.reload()
  await expect(tabBar(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Bench press/ })).toBeVisible()
})

test('archived plans have no Start; Restore returns them to the active list', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Start Old block' })).toHaveCount(0)
  await page.getByRole('button', { name: /Show archived/ }).click()
  await expect(page.getByRole('button', { name: 'Start Old block' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Restore Old block' }).click()
  await expect(page.getByRole('button', { name: 'Start Old block' })).toBeVisible()
})

test('+ New plan opens the form', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '+ New plan' }).click()
  await expect(page.getByPlaceholder('e.g. Push Day')).toBeVisible()
})

test('Archive moves a plan out of the active list; Delete removes it after confirming', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Archive Push day' }).click()
  await expect(page.getByRole('button', { name: 'Start Push day' })).toHaveCount(0)
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: `Delete ${longName}` }).click()
  await expect(page.getByRole('button', { name: `Start ${longName}` })).toHaveCount(0)
})

for (const width of [375, 768, 1280]) {
  test(`a long plan name does not overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/')
    await expect(page.getByRole('button', { name: `Start ${longName}` })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
}
