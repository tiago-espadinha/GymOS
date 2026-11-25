import AxeBuilder from '@axe-core/playwright'
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
})

const nav = (page: Page) => page.getByRole('navigation', { name: 'Main' })
const box = async (page: Page, selector: string) => (await page.locator(selector).first().boundingBox())!

test.describe('tablet, 768 wide', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('the bottom tab bar and every screen share one centred 600 column', async ({ page }) => {
    await page.goto('/')
    const bar = (await nav(page).boundingBox())!
    expect(bar.width).toBe(600)
    expect(bar.x).toBe(84)
    expect(bar.y + bar.height).toBe(1024)
    await expect(page.getByText('GymOS', { exact: true })).toBeHidden()
    for (const tab of ['Plans', 'Log', 'Stats']) {
      await nav(page).getByRole('button', { name: tab }).click()
      expect(await box(page, '.mainContent')).toMatchObject({ x: 84, width: 600 })
    }
  })
})

test.describe('wide, 1280', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false })

  test('a 72 top bar with the wordmark and tabs replaces the bottom bar', async ({ page }) => {
    await page.goto('/')
    const bar = await box(page, '.shellBar')
    expect(bar).toMatchObject({ x: 0, y: 0, width: 1280, height: 72 })
    await expect(page.getByText('GymOS', { exact: true })).toBeVisible()
    await expect(nav(page).getByRole('button')).toHaveText(['Plans', 'Log', 'Stats'])

    const log = nav(page).getByRole('button', { name: 'Log' })
    await log.click()
    await expect(log).toHaveAttribute('aria-current', 'page')
    const active = await log.evaluate((el) => getComputedStyle(el))
    expect(active.borderBottomWidth).toBe('4px')
    expect(active.color).toBe(active.borderBottomColor)
    expect((await log.boundingBox())!.height).toBeGreaterThanOrEqual(44)

    // The bar's content sits in the 1200 frame: 40 in from each side at 1280.
    const wordmark = (await page.getByText('GymOS', { exact: true }).boundingBox())!
    expect(wordmark.x).toBe(40)
    const last = (await nav(page).getByRole('button', { name: 'Stats' }).boundingBox())!
    expect(last.x + last.width).toBe(1240)
  })

  test('the top bar stays at the top when the page scrolls', async ({ page }) => {
    await page.goto('/')
    await expect(nav(page)).toBeVisible()
    await page.evaluate(() => { (document.querySelector('.mainContent') as HTMLElement).style.minHeight = '3000px' })
    await page.mouse.wheel(0, 1000)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
    expect((await box(page, '.shellBar')).y).toBe(0)
  })

  test('screens without a wide layout keep the 600 column; sheets stay 560', async ({ page }) => {
    await page.goto('/')
    await nav(page).getByRole('button', { name: 'Stats' }).click()
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible()
    expect(await box(page, '.mainContent')).toMatchObject({ x: 340, width: 600 })
    await nav(page).getByRole('button', { name: 'Plans' }).click()
    await page.getByRole('button', { name: 'More actions for Push day' }).click()
    expect((await page.getByRole('dialog').boundingBox())!.width).toBe(560)
  })

  test('Log home has its own two panes in the 1200 frame', async ({ page }) => {
    await page.goto('/')
    await nav(page).getByRole('button', { name: 'Log' }).click()
    expect(await box(page, '.mainContent')).toMatchObject({ x: 0, width: 1280 })
    expect(await box(page, '.logHome')).toMatchObject({ x: 40, width: 1200 })
  })

  test('Stats has its own two panes in the 1200 frame', async ({ page }) => {
    await page.goto('/')
    await nav(page).getByRole('button', { name: 'Stats' }).click()
    expect(await box(page, '.mainContent')).toMatchObject({ x: 0, width: 1280 })
    expect(await box(page, '.progressTab')).toMatchObject({ x: 40, width: 1200 })
  })

  test('Plans has its own two panes in the 1200 frame', async ({ page }) => {
    await page.goto('/')
    await nav(page).getByRole('button', { name: 'Plans' }).click()
    expect(await box(page, '.mainContent')).toMatchObject({ x: 0, width: 1280 })
    expect(await box(page, '.plansTab')).toMatchObject({ x: 40, width: 1200 })
  })

  test('a session hides all navigation and keeps the column', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Start Push day' }).click()
    await expect(nav(page)).toHaveCount(0)
    await expect(page.getByText('GymOS', { exact: true })).toHaveCount(0)
    expect(await box(page, '.mainContent')).toMatchObject({ x: 340, width: 600 })
  })

  test('the wide shell has no detectable WCAG A/AA violations', async ({ page }) => {
    await page.goto('/')
    await expect(nav(page)).toBeVisible()
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
  })
})
