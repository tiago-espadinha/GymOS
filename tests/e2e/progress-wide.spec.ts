import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// Board "B · Two panes · Progress": the exercise search and list on the left, the chart on the right.
const names = ['Bench press', 'Face pull', 'Hip thrust', 'Lat pulldown', 'Leg press', 'Machine row', 'Overhead press', 'Romanian deadlift', 'Seated cable row', 'Squat']
const plan = { id: 'p1', name: 'Full', desc: '', exercises: names.map((name, i) => ({ id: `e${i}`, name, muscleGroup: 'Back' })) }
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)
// Average per rep rises every session, so the latest is a PR.
const sessions = [40, 45, 50, 55].map((w, i) => ({
  id: `s${i}`,
  planId: 'p1',
  planName: 'Full',
  date: daysAgo(40 - i * 10),
  notes: '',
  exercises: [{ id: 'e3', name: 'Lat pulldown', muscleGroup: 'Back', sets: [{ id: 'a', weight: String(w), reps: '10', completed: true }] }],
}))

const open = async (page: Page, selected = 'Lat pulldown') => {
  await page.addInitScript(
    ([p, s, ex]) => {
      if (localStorage.getItem('gym:plans')) return
      localStorage.setItem('gym:plans', JSON.stringify([p]))
      localStorage.setItem('gym:sessions', JSON.stringify(s))
      localStorage.setItem('gym:tab', JSON.stringify('progress'))
      localStorage.setItem('gym:selectedExName', JSON.stringify(ex))
    },
    [plan, sessions, selected] as const,
  )
  await page.goto('/')
}

const pane = (page: Page) => page.locator('.progressPane')
const list = (page: Page) => pane(page).getByRole('listbox', { name: 'Exercises' })
const option = (page: Page, name: string) => list(page).getByRole('option', { name: new RegExp(`^${name}`) })
const detail = (page: Page, name: string) => page.getByRole('region', { name })
const search = (page: Page) => pane(page).getByRole('searchbox', { name: 'Search exercises' })
const axe = (page: Page) => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()

test.describe('at 1280', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false })

  test('the list sits in the 440 pane and the chosen exercise fills the right', async ({ page }) => {
    await open(page)
    const left = (await pane(page).boundingBox())!
    expect(left).toMatchObject({ x: 40, width: 440 })
    const right = (await detail(page, 'Lat pulldown').boundingBox())!
    expect(right.x).toBe(520)
    expect(right.x + right.width).toBe(1240)

    // No sheet and no name button at this width: the search is always there, not focused.
    await expect(page.getByRole('button', { name: /^Exercise: / })).toHaveCount(0)
    await expect(search(page)).toBeVisible()
    await expect(search(page)).not.toBeFocused()
    await expect(search(page)).toHaveAttribute('placeholder', 'Search exercises')
    await expect(pane(page).getByText('10 exercises')).toBeVisible()
    await expect(pane(page).getByRole('button', { name: 'Settings' })).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 2, name: 'Lat pulldown' })).toBeVisible()

    const chart = (await page.locator('.progressChart').boundingBox())!
    expect(chart).toMatchObject({ x: 520, width: 720, height: 300 })
    const [last, best] = await page.locator('.progressStat').all()
    const a = (await last.boundingBox())!
    const b = (await best.boundingBox())!
    expect(b.x).toBeGreaterThan(a.x + a.width)
    expect(Math.abs(a.y - b.y)).toBeLessThan(2)
  })

  test('the chosen row fills with the accent and keeps a check, and picking another updates the right pane', async ({ page }) => {
    await open(page)
    await expect(option(page, 'Lat pulldown')).toHaveAttribute('aria-selected', 'true')
    await expect(option(page, 'Lat pulldown').locator('svg')).toHaveCount(1)
    await expect(option(page, 'Lat pulldown')).toHaveCSS('background-color', 'rgb(198, 255, 61)')
    await expect(option(page, 'Lat pulldown')).toContainText('4 sessions · last')
    await expect(page.locator('.progressStatKicker').nth(1)).toHaveText('New PR')
    await expect(page.locator('.progressChartPR')).toHaveText('PR')

    await option(page, 'Machine row').click()
    await expect(option(page, 'Machine row')).toHaveAttribute('aria-selected', 'true')
    await expect(option(page, 'Machine row')).toBeFocused()
    await expect(page.getByRole('heading', { level: 2, name: 'Machine row' })).toBeVisible()
  })

  test('typing filters the list and counts, and no match says so', async ({ page }) => {
    await open(page)
    await search(page).fill('ROW')
    await expect(list(page).getByRole('option')).toHaveText([/^Machine row/, /^Seated cable row/])
    await expect(pane(page).getByText('2 of 10 exercises')).toBeVisible()
    // The chart keeps the chosen exercise even when the filter hides it.
    await expect(page.getByRole('heading', { level: 2, name: 'Lat pulldown' })).toBeVisible()
    await search(page).press('ArrowDown')
    await expect(option(page, 'Machine row')).toBeFocused()
    await search(page).fill('squat press')
    await expect(pane(page).getByText('No exercise matches “squat press”.')).toBeVisible()
    expect((await axe(page)).violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
  })

  test('the list scrolls in its own box and opens at the chosen exercise', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 })
    await open(page, 'Squat')
    const box = list(page)
    expect(await box.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true)
    await expect(option(page, 'Squat')).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(600)
  })

  test('nothing logged sits in the right pane, and Go to Log opens Log', async ({ page }) => {
    await open(page, 'Seated cable row')
    const right = detail(page, 'Seated cable row')
    await expect(right.getByRole('heading', { level: 3, name: 'Nothing logged yet' })).toBeVisible()
    await expect(right.getByText('Seated cable row is in 1 plan but has no saved sets.')).toBeVisible()
    await expect(page.locator('.progressChart')).toHaveCount(0)
    expect((await axe(page)).violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
    await right.getByRole('button', { name: 'Go to Log' }).click()
    await expect(page.getByRole('button', { name: 'Log', exact: true })).toHaveAttribute('aria-current', 'page')
  })

  test('the Stats title shrinks to the pane label, as Plans does', async ({ page }) => {
    await open(page)
    const size = (el: Element) => getComputedStyle(el).fontSize
    const progress = await pane(page).getByRole('heading', { name: 'Stats', level: 1 }).evaluate(size)
    await page.getByRole('navigation', { name: 'Main' }).getByText('Plans').click()
    const plans = await page.getByRole('heading', { name: '1 Plan', level: 1 }).evaluate(size)
    expect(progress).toBe(plans)
    expect(parseFloat(progress)).toBeLessThan(20)
  })

  test('Settings is the fourth tab in the top bar, lit while open', async ({ page }) => {
    await open(page)
    const settings = page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Settings' })
    await settings.click()
    await expect(pane(page)).toHaveCount(0)
    await expect(settings).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(0)
  })

  test('Stats with data has no detectable WCAG A/AA violations', async ({ page }) => {
    await open(page)
    expect((await axe(page)).violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
  })
})

test.describe('turning wide', () => {
  test.use({ viewport: { width: 768, height: 1024 }, isMobile: false, hasTouch: false })

  test('closes the search sheet, which does not reopen on its own', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: /^Exercise: / }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(pane(page)).toBeVisible()
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.getByRole('button', { name: /^Exercise: / })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})

test.describe('at 1024', () => {
  test.use({ viewport: { width: 1024, height: 768 }, isMobile: false, hasTouch: false })

  test('both panes fit with no sideways scroll', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: 'e1RM', exact: true }).click()
    await expect(pane(page)).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024)
    const right = (await detail(page, 'Lat pulldown').boundingBox())!
    expect(right.x + right.width).toBeLessThanOrEqual(984)
  })
})
