import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const plans = [{ id: 'p1', name: 'Pull day', desc: '', exercises: [{ id: 'e1', name: 'Row', muscleGroup: 'Back' }] }]
const sessions = [
  {
    id: 's1',
    planId: 'p1',
    planName: 'Pull day',
    date: '2026-01-01',
    notes: '',
    exercises: [{ id: 'e1', name: 'Row', muscleGroup: 'Back', sets: [{ id: 'x', weight: '60', reps: '10' }] }],
  },
]

const raw = (page: Page) =>
  page.evaluate(() => ({ plans: localStorage.getItem('gym:plans'), sessions: localStorage.getItem('gym:sessions') }))

const openSettings = async (page: Page) => {
  await page.getByText('Progress', { exact: true }).first().click()
  await page.getByRole('button', { name: 'Settings' }).click()
}

test.beforeEach(async ({ page }) => {
  // Seed once, so a reload keeps what the test changed.
  await page.addInitScript(
    ([p, s]) => {
      if (sessionStorage.getItem('seeded')) return
      sessionStorage.setItem('seeded', '1')
      localStorage.setItem('gym:plans', JSON.stringify(p))
      localStorage.setItem('gym:sessions', JSON.stringify(s))
    },
    [plans, sessions] as const,
  )
  await page.goto('/')
})

test('Settings opens from Progress with Data, Language, Units and Appearance in order', async ({ page }) => {
  await openSettings(page)
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeFocused()
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Data', 'Language', 'Units', 'Appearance'])

  await expect(page.locator('.settingsRow').filter({ hasText: 'App language' })).toContainText('English')

  await expect(page.getByRole('group', { name: 'Weight unit' }).getByRole('button', { name: 'kg' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('group', { name: 'Distance unit' }).getByRole('button', { name: 'km' })).toHaveAttribute('aria-pressed', 'true')
})

test('the Plans empty-state import link opens Settings', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('gym:plans', '[]')
    localStorage.setItem('gym:sessions', '[]')
  })
  await page.reload()
  await page.getByRole('button', { name: 'Plans', exact: true }).click()
  await page.getByRole('button', { name: 'Have a CSV backup? Import it' }).click()
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeFocused()
})

test('unit choices survive a reload and leave stored plans and sessions untouched', async ({ page }) => {
  const before = await raw(page)
  await openSettings(page)
  await page.getByRole('group', { name: 'Weight unit' }).getByRole('button', { name: 'lb', exact: true }).click()
  await page.getByRole('group', { name: 'Distance unit' }).getByRole('button', { name: 'mi' }).click()

  await page.reload()
  await openSettings(page)
  await expect(page.getByRole('group', { name: 'Weight unit' }).getByRole('button', { name: 'lb', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('group', { name: 'Distance unit' }).getByRole('button', { name: 'mi' })).toHaveAttribute('aria-pressed', 'true')
  expect(await raw(page)).toEqual(before)
})

test('a unit choice the browser refuses to store is undone and reported', async ({ page }) => {
  await openSettings(page)
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError')
    }
  })
  await page.getByRole('group', { name: 'Weight unit' }).getByRole('button', { name: 'lb', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Not saved')
  await expect(page.getByRole('group', { name: 'Weight unit' }).getByRole('button', { name: 'kg' })).toHaveAttribute('aria-pressed', 'true')
})

test('Settings has no detectable WCAG A/AA violations', async ({ page }) => {
  await openSettings(page)
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
})
