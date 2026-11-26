import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const plans = [
  { id: 'p1', name: 'Push day', desc: '', exercises: [{ id: 'e1', name: 'Bench press', muscleGroup: 'Chest' }] },
  { id: 'p2', name: 'Old block', desc: '', isArchived: true, exercises: [{ id: 'e1', name: 'Bench press', muscleGroup: 'Chest' }] },
]

// 23 sessions, newest first: Push day every other day, an archived plan, a deleted plan
// ("Legs", id p9) and imported sessions with no plan id ("Back").
const planOf = (i: number) =>
  i % 2 === 0
    ? { planId: 'p1', planName: 'Push day' }
    : [{ planId: 'p2', planName: 'Old block' }, { planId: 'p9', planName: 'Legs' }, { planId: '', planName: 'Back' }][i % 3]
const day = (i: number) => new Date(Date.UTC(2026, 10, 20 - i)).toISOString().slice(0, 10)
const sessions = Array.from({ length: 23 }, (_, i) => ({
  id: `s${i}`,
  ...planOf(i),
  date: day(i),
  notes: '',
  exercises: [{ id: 'e1', name: 'Bench press', muscleGroup: 'Chest', sets: [{ id: 'a', weight: '60', reps: '10' }] }],
}))
const count = (planName: string) => sessions.filter((s) => s.planName === planName).length

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ([p, s]) => {
      if (localStorage.getItem('gym:plans')) return
      localStorage.setItem('gym:plans', JSON.stringify(p))
      localStorage.setItem('gym:sessions', JSON.stringify(s))
    },
    [plans, sessions],
  )
  await page.goto('/')
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Log' }).click()
})

const recent = (page: Page) => page.getByRole('region', { name: 'Recent sessions' })
const rows = (page: Page) => recent(page).getByRole('listitem')
const filter = (page: Page) => recent(page).getByRole('button', { name: /^Filter by plan/ })
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Filter by plan' })
const option = (page: Page, name: string) => sheet(page).getByRole('option', { name: new RegExp(`^${name} `) })
const pickPlan = async (page: Page, name: string) => {
  await filter(page).click()
  await option(page, name).click()
  await expect(sheet(page)).toHaveCount(0)
}
const showMore = (page: Page) => recent(page).getByRole('button', { name: 'Show more' })

test('Show more adds ten older sessions at a time, then says all are shown', async ({ page }) => {
  await expect(rows(page)).toHaveCount(6)
  await expect(recent(page).getByText('6 of 23')).toBeVisible()

  await showMore(page).click()
  await expect(rows(page)).toHaveCount(16)
  await expect(recent(page).getByText('16 of 23')).toBeVisible()
  // Focus lands on the first added row, the seventh newest.
  await expect(rows(page).nth(6).getByRole('button', { name: /^Edit / })).toBeFocused()

  await showMore(page).click()
  await expect(rows(page)).toHaveCount(23)
  await expect(rows(page).last()).toContainText('Push day')
  await expect(showMore(page)).toHaveCount(0)
  await expect(recent(page).getByText('All 23 shown')).toBeVisible()
  await expect(rows(page).nth(16).getByRole('button', { name: /^Edit / })).toBeFocused()
})

test('the filter icon opens a sheet of every plan with sessions, archived, deleted and imported ones too', async ({ page }) => {
  await expect(filter(page)).toHaveAccessibleName('Filter by plan')
  const box = (await filter(page).boundingBox())!
  expect(box.width).toBeGreaterThanOrEqual(44)
  expect(box.height).toBeGreaterThanOrEqual(44)

  await filter(page).click()
  const options = sheet(page).getByRole('option')
  await expect(options.locator('.planPicker__name')).toHaveText(['All plans', 'Push day', 'Legs', 'Old block', 'Back'])
  await expect(option(page, 'All plans')).toContainText('23 sessions')
  await expect(option(page, 'Legs')).toContainText(`${count('Legs')} sessions`)
  await expect(option(page, 'All plans')).toHaveAttribute('aria-selected', 'true')

  await option(page, 'Legs').click()
  await expect(sheet(page)).toHaveCount(0)
  await expect(filter(page)).toHaveAccessibleName('Filter by plan, Legs')
  await expect(filter(page)).toHaveText('Legs')
  await expect(filter(page)).toBeFocused()
  await expect(rows(page)).toHaveCount(count('Legs'))
  for (const row of await rows(page).all()) await expect(row).toContainText('Legs')
  await expect(showMore(page)).toHaveCount(0)

  await filter(page).click()
  await expect(option(page, 'Legs')).toHaveAttribute('aria-selected', 'true')
  await option(page, 'Back').click()
  await expect(rows(page)).toHaveCount(count('Back'))
})

test('a filter pages on its own, and All plans clears it back to six', async ({ page }) => {
  await pickPlan(page, 'Push day')
  await expect(rows(page)).toHaveCount(6)
  await expect(recent(page).getByText(`6 of ${count('Push day')}`)).toBeVisible()
  await showMore(page).click()
  await expect(rows(page)).toHaveCount(count('Push day'))
  await expect(recent(page).getByText(`All ${count('Push day')} shown`)).toBeVisible()

  await pickPlan(page, 'All plans')
  await expect(filter(page)).toHaveAccessibleName('Filter by plan')
  await expect(filter(page)).toHaveText('')
  await expect(rows(page)).toHaveCount(6)
  await expect(recent(page).getByText('6 of 23')).toBeVisible()
})

test('the filter works from the keyboard and returns focus to the icon', async ({ page }) => {
  await filter(page).focus()
  await page.keyboard.press('Enter')
  await expect(option(page, 'All plans')).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(option(page, 'Push day')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(sheet(page)).toHaveCount(0)
  await expect(filter(page)).toBeFocused()
  await expect(rows(page)).toHaveCount(6)

  await page.keyboard.press('Space')
  await page.keyboard.press('End')
  await expect(option(page, 'Back')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(sheet(page)).toHaveCount(0)
  await expect(filter(page)).toBeFocused()
  await expect(rows(page)).toHaveCount(count('Back'))

  await page.keyboard.press('Enter')
  await expect(option(page, 'Back')).toBeFocused()
  await sheet(page).getByRole('button', { name: 'Close' }).click()
  await expect(filter(page)).toBeFocused()
  await expect(rows(page)).toHaveCount(count('Back'))
})

test('a long plan name truncates in the filter pill; the title and count stay on one line', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const long = 'Legs and glutes heavy block'
  await page.evaluate((name) => {
    const s = JSON.parse(localStorage.getItem('gym:sessions')!)
    localStorage.setItem('gym:sessions', JSON.stringify(s.map((x: { planName: string }) => (x.planName === 'Push day' ? { ...x, planName: name } : x))))
  }, long)
  await page.reload()
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Log' }).click()
  await pickPlan(page, long)
  await expect(filter(page)).toHaveAccessibleName(`Filter by plan, ${long}`)
  const head = await recent(page).getByRole('heading', { name: 'Recent sessions' }).boundingBox()
  const countText = await recent(page).getByText(/^\d+ of \d+/).boundingBox()
  const pill = (await filter(page).boundingBox())!
  expect(Math.abs(head!.height - countText!.height)).toBeLessThan(8)
  expect(pill.x + pill.width).toBeLessThanOrEqual(375)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
})

test('Edit works on an older session reached through Show more', async ({ page }) => {
  await showMore(page).click()
  await rows(page).nth(15).getByRole('button', { name: /^Edit / }).click()
  await expect(page.getByText(/^Editing · [A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2} · \d+ sets?$/)).toBeVisible()
})

const axe = async (page: Page) =>
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([])

test('Log home with the filter and Show more passes axe, the filter sheet too', async ({ page }) => {
  await showMore(page).click()
  await expect(rows(page)).toHaveCount(16)
  await axe(page)
  await filter(page).click()
  await expect(sheet(page)).toBeVisible()
  await axe(page)
  await option(page, 'Old block').click()
  await expect(filter(page)).toHaveAccessibleName('Filter by plan, Old block')
  await axe(page)
})

test('one plan only: no filter, and six or fewer sessions: no count or Show more', async ({ page }) => {
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('gym:sessions')!)
    localStorage.setItem('gym:sessions', JSON.stringify(s.slice(0, 5).map((x: object) => ({ ...x, planId: 'p1', planName: 'Push day' }))))
  })
  await page.reload()
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Log' }).click()
  await expect(rows(page)).toHaveCount(5)
  await expect(filter(page)).toHaveCount(0)
  await expect(showMore(page)).toHaveCount(0)
  await expect(recent(page).getByText(/ of |shown/)).toHaveCount(0)
})

test.describe('wide, 1280', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('the filter sits on the Recent title row at the table end, Show more under the table, label-sized', async ({ page }) => {
    const title = (await recent(page).getByRole('heading', { name: 'Recent sessions' }).boundingBox())!
    const icon = (await filter(page).boundingBox())!
    const table = (await recent(page).getByRole('list').boundingBox())!
    const more = (await showMore(page).boundingBox())!
    expect(Math.abs(icon.y + icon.height / 2 - (title.y + title.height / 2))).toBeLessThan(4)
    expect(icon.x).toBeGreaterThan(title.x + title.width)
    expect(icon.x + icon.width).toBeLessThanOrEqual(table.x + table.width + 1)
    expect(table.y).toBeGreaterThan(icon.y + icon.height - 1)
    expect(more.y).toBeGreaterThan(table.y + table.height - 1)
    expect(more.width).toBeLessThan(table.width / 2)
    await showMore(page).click()
    await expect(rows(page)).toHaveCount(16)
  })
})
