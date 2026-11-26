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

const settingsTab = (page: Page) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Settings' })
const openSettings = (page: Page) => settingsTab(page).click()

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

test('Settings is a tab, lit while open, with Appearance, Units, Language and Data in order and no Close', async ({ page }) => {
  await openSettings(page)
  await expect(settingsTab(page)).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Appearance', 'Units', 'Language', 'Data'])

  await expect(page.locator('.settingsRow').filter({ hasText: 'App language' })).toContainText('English')

  await expect(page.getByRole('group', { name: 'Weight unit' }).getByRole('button', { name: 'kg' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('group', { name: 'Distance unit' }).getByRole('button', { name: 'km' })).toHaveAttribute('aria-pressed', 'true')
})

test('Settings ends with About: the mark, the name and where data lives', async ({ page }) => {
  await openSettings(page)
  const about = page.locator('.settingsAbout')
  await expect(about).toHaveText('GymOSData stays on this device')
  expect(await page.locator('.dataScreen > *').last().getAttribute('class')).toBe('settingsAbout')
  const mark = (await about.locator('.brandMark').boundingBox())!
  expect(mark).toMatchObject({ width: 48, height: 48 })

  // The last tick follows the chosen accent.
  const lastTickFill = () => about.locator('.brandMark__tick--on').evaluate((el) => getComputedStyle(el).fill)
  const lime = await lastTickFill()
  await accentGroup(page).getByRole('button', { name: 'Amber' }).click()
  const amber = await lastTickFill()
  expect(amber).not.toBe(lime)
  expect(amber).toBe(await page.locator('.accentSwatch--amber').evaluate((el) => getComputedStyle(el).backgroundColor))
})

test('the Plans empty-state import link opens the Settings tab and the file picker', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('gym:plans', '[]')
    localStorage.setItem('gym:sessions', '[]')
  })
  await page.reload()
  await page.getByRole('button', { name: 'Plans', exact: true }).click()
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Have a CSV backup? Import it' }).click()])
  await expect(settingsTab(page)).toHaveAttribute('aria-current', 'page')

  // The link is gone with the Plans tab, so closing the sheet returns focus to Import.
  await chooser.setFiles({ name: 'notes.csv', mimeType: 'text/csv', buffer: Buffer.from('name,weight\nRow,60') })
  await expect(page.getByRole('heading', { name: "Can't import this file" })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeFocused()

  // Leaving and coming back does not open the picker again.
  let reopened = false
  page.on('filechooser', () => (reopened = true))
  await page.getByRole('button', { name: 'Plans', exact: true }).click()
  await openSettings(page)
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible()
  expect(reopened).toBe(false)
})

test('the Stats screen has no Settings pill, and a session hides the Settings tab', async ({ page }) => {
  await page.getByRole('button', { name: 'Stats', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Stats', level: 1 })).toBeVisible()
  await expect(page.locator('.mainContent').getByRole('button', { name: 'Settings' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Plans', exact: true }).click()
  await page.getByRole('button', { name: 'Start Pull day' }).click()
  await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0)
})

test('the four tabs fit at 320 without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  const tabs = page.getByRole('navigation', { name: 'Main' }).getByRole('button')
  await expect(tabs).toHaveText(['Plans', 'Log', 'Stats', 'Settings'])
  for (const tab of await tabs.all()) {
    expect(await tab.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    expect(await tab.evaluate((el) => getComputedStyle(el).fontSize)).toBe('22px')
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
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

const accentGroup = (page: Page) => page.getByRole('group', { name: 'Accent colour' })
const rootAccent = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim())

test('an accent choice recolours the app and survives a reload', async ({ page }) => {
  const before = await raw(page)
  await openSettings(page)
  await expect(accentGroup(page).getByRole('button', { name: 'Lime' })).toHaveAttribute('aria-pressed', 'true')
  expect(await rootAccent(page)).toBe('#c6ff3d')

  await accentGroup(page).getByRole('button', { name: 'Amber' }).click()
  await expect(accentGroup(page).getByRole('button', { name: 'Amber' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.accentName')).toHaveText('Amber')
  expect(await rootAccent(page)).toBe('#ffb21a')

  await page.reload()
  expect(await rootAccent(page)).toBe('#ffb21a')
  await page.getByRole('button', { name: 'Plans', exact: true }).click()
  await expect(page.locator('.tab-bar__tab[aria-current="page"]')).toHaveCSS('border-top-color', 'rgb(255, 178, 26)')
  await openSettings(page)
  await expect(accentGroup(page).getByRole('button', { name: 'Amber' })).toHaveAttribute('aria-pressed', 'true')
  expect(await raw(page)).toEqual(before)
})

test('an unknown stored accent falls back to lime', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('gym:accent', JSON.stringify('pink')))
  await page.reload()
  expect(await rootAccent(page)).toBe('#c6ff3d')
  await openSettings(page)
  await expect(accentGroup(page).getByRole('button', { name: 'Lime' })).toHaveAttribute('aria-pressed', 'true')
})

test('an accent the browser refuses to store is undone and reported', async ({ page }) => {
  await openSettings(page)
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError')
    }
  })
  await accentGroup(page).getByRole('button', { name: 'Violet' }).click()
  await expect(page.getByRole('alert')).toContainText('Not saved')
  await expect(accentGroup(page).getByRole('button', { name: 'Lime' })).toHaveAttribute('aria-pressed', 'true')
  expect(await rootAccent(page)).toBe('#c6ff3d')
})

for (const accent of ['lime', 'amber', 'cyan', 'violet', 'red']) {
  test(`Settings and Plans have no detectable WCAG A/AA violations in ${accent}`, async ({ page }) => {
    await page.evaluate((a) => localStorage.setItem('gym:accent', JSON.stringify(a)), accent)
    await page.reload()
    for (const open of [() => openSettings(page), () => page.getByRole('button', { name: 'Plans', exact: true }).click()]) {
      await open()
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
      expect(violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
    }
  })
}
