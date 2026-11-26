import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// Board "plan-overview" O1, S1, R1, W1: a plan's overview after Save and from the list.
const plans = [
  {
    id: 'p1',
    name: 'Push day',
    desc: 'Heavy compounds first, accessories after.',
    exercises: [
      { id: 'e1', name: 'Bench press', muscleGroup: 'Chest' },
      { id: 'e2', name: 'Overhead press', muscleGroup: 'Shoulders' },
      { id: 'e3', name: 'Plank', muscleGroup: 'Core', category: 'calisthenics', trackingType: 'time' },
    ],
  },
  { id: 'p2', name: 'Legs', desc: '', exercises: [{ id: 'e4', name: 'Squat', muscleGroup: 'Legs' }] },
]
const sessions = [{ id: 's1', planId: 'p1', planName: 'Push day', date: '2026-11-21', notes: '', exercises: [] }]

const open = async (page: Page, p: unknown[] = plans) => {
  await page.clock.setFixedTime(new Date('2026-11-25T10:00:00'))
  await page.addInitScript(
    ([p, s]) => {
      if (localStorage.getItem('gym:plans')) return
      localStorage.setItem('gym:plans', JSON.stringify(p))
      localStorage.setItem('gym:sessions', JSON.stringify(s))
    },
    [p, sessions] as const,
  )
  await page.goto('/')
}

const tabBar = (page: Page) => page.getByRole('navigation', { name: 'Main' })
const listRow = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(`^${name} \\d+ exercises?`) })
const overview = (page: Page, name: string) => page.getByRole('region', { name })
const back = (page: Page) => page.getByRole('button', { name: 'Back to Plans' })
const axe = (page: Page) => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()

async function createPlan(page: Page, name: string) {
  await page.getByRole('button', { name: '+ Create New' }).first().click()
  await page.getByLabel('Name', { exact: true }).fill(name)
  await page.getByLabel('Description · optional').fill('Two rounds')
  await page.getByLabel('Exercise 1 name').fill('Row')
  await page.getByRole('button', { name: 'Save plan' }).click()
}

test.describe('phone', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('tapping a listed plan opens its overview; Back returns to the list and focuses that plan', async ({ page }) => {
    await open(page)
    await listRow(page, 'Push day').click()

    const screen = overview(page, 'Push day')
    await expect(page.getByRole('heading', { name: 'Push day', level: 1 })).toBeFocused()
    await expect(screen.getByText('Plan · last trained 21 Nov')).toBeVisible()
    await expect(screen.getByText('3 exercises · Chest, Shoulders, Core')).toBeVisible()
    await expect(screen.getByText('Heavy compounds first, accessories after.')).toBeVisible()
    await expect(screen.getByRole('listitem')).toHaveText([/Bench press/, /Overhead press/, /Plank.*time$/])
    await expect(screen.getByRole('button', { name: 'Start Push day' })).toBeVisible()
    await expect(screen.getByRole('button', { name: 'More actions for Push day' })).toBeVisible()
    await expect(screen.getByRole('button', { name: 'Done' })).toHaveCount(0)
    await expect(tabBar(page)).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
    expect((await axe(page)).violations.map((v) => v.id)).toEqual([])

    await back(page).click()
    await expect(page.getByRole('heading', { name: '2 Plans', level: 1 })).toBeVisible()
    await expect(listRow(page, 'Push day')).toBeFocused()
  })

  test('saving a new plan shows its overview as saved; Done returns to Plans with the plan listed', async ({ page }) => {
    await open(page)
    await createPlan(page, 'Pull day')

    const screen = overview(page, 'Pull day')
    await expect(page.getByRole('heading', { name: 'Pull day', level: 1 })).toBeFocused()
    await expect(page.getByRole('heading', { name: 'Pull day', level: 1 })).toHaveAccessibleDescription('Plan saved')
    await expect(back(page)).toBeInViewport()
    await expect(screen.getByText('Plan saved')).toBeVisible()
    await expect(screen.getByText('Two rounds')).toBeVisible()
    await expect(screen.getByRole('listitem')).toHaveText([/Row/])
    await expect(tabBar(page)).toBeVisible()
    expect((await axe(page)).violations.map((v) => v.id)).toEqual([])

    await screen.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByRole('heading', { name: '3 Plans', level: 1 })).toBeVisible()
    await expect(listRow(page, 'Pull day')).toBeFocused()

    // Opened again from the list it is a plain overview.
    await listRow(page, 'Pull day').click()
    await expect(overview(page, 'Pull day').getByText('Plan · not trained yet')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Done' })).toHaveCount(0)
  })

  test('Start on the overview begins that plan\'s session', async ({ page }) => {
    await open(page)
    await listRow(page, 'Push day').click()
    await page.getByRole('button', { name: 'Start Push day' }).click()
    await expect(tabBar(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Bench press/ })).toBeVisible()
  })

  test('archiving from the overview returns to the list with Undo', async ({ page }) => {
    await open(page)
    await listRow(page, 'Push day').click()
    await page.getByRole('button', { name: 'More actions for Push day' }).click()
    await page.getByRole('button', { name: 'Archive' }).click()
    await expect(page.getByRole('heading', { name: '1 Plan', level: 1 })).toBeFocused()
    await expect(page.getByText('Push day archived')).toBeVisible()
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(listRow(page, 'Push day')).toBeVisible()
  })

  test('a just-saved plan archived and brought back with Undo is no longer marked saved', async ({ page }) => {
    await open(page)
    await createPlan(page, 'Pull day')
    await page.getByRole('button', { name: 'More actions for Pull day' }).click()
    await page.getByRole('button', { name: 'Archive' }).click()
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByRole('heading', { name: '3 Plans', level: 1 })).toBeVisible()
    await listRow(page, 'Pull day').click()
    await expect(overview(page, 'Pull day').getByText('Plan · not trained yet')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Done' })).toHaveCount(0)
  })

  test('the list row keeps Start and ⋯ as their own targets', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: 'More actions for Legs' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('2 Plans')
    const box = await listRow(page, 'Legs').boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)

    await page.getByRole('button', { name: 'Start Legs' }).click()
    await expect(tabBar(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Squat/ })).toBeVisible()
  })
})

test.describe('wide', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false })

  test('saving returns to the two panes with the new plan selected and marked saved until another is picked', async ({ page }) => {
    await open(page)
    await createPlan(page, 'Pull day')

    const row = page.locator('.plansPane').getByRole('button', { name: /^Pull day / })
    await expect(row).toHaveAttribute('aria-current', 'true')
    await expect(page.getByRole('heading', { name: 'Pull day', level: 2 })).toBeFocused()
    await expect(overview(page, 'Pull day').getByText('Plan saved')).toBeVisible()
    await expect(back(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Done' })).toHaveCount(0)

    await page.locator('.plansPane').getByRole('button', { name: /^Legs / }).click()
    await row.click()
    await expect(overview(page, 'Pull day').getByText('Plan · not trained yet')).toBeVisible()
  })
})
