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
const filter = (page: Page) => recent(page).getByRole('group', { name: 'Filter by plan' })
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

test('the plan filter lists every plan with sessions, archived, deleted and imported ones too', async ({ page }) => {
  const chips = filter(page).getByRole('button')
  await expect(chips).toHaveText(['All', 'Push day', 'Legs', 'Old block', 'Back'])
  await expect(chips.first()).toHaveAttribute('aria-pressed', 'true')
  for (const chip of await chips.all()) expect((await chip.boundingBox())!.height).toBeGreaterThanOrEqual(44)

  await filter(page).getByRole('button', { name: 'Legs' }).click()
  await expect(filter(page).getByRole('button', { name: 'Legs' })).toHaveAttribute('aria-pressed', 'true')
  await expect(rows(page)).toHaveCount(count('Legs'))
  for (const row of await rows(page).all()) await expect(row).toContainText('Legs')
  await expect(showMore(page)).toHaveCount(0)

  await filter(page).getByRole('button', { name: 'Back' }).click()
  await expect(rows(page)).toHaveCount(count('Back'))
})

test('a filter pages on its own and resets the list to six when changed', async ({ page }) => {
  await filter(page).getByRole('button', { name: 'Push day' }).click()
  await expect(rows(page)).toHaveCount(6)
  await expect(recent(page).getByText(`6 of ${count('Push day')}`)).toBeVisible()
  await showMore(page).click()
  await expect(rows(page)).toHaveCount(count('Push day'))
  await expect(recent(page).getByText(`All ${count('Push day')} shown`)).toBeVisible()

  await filter(page).getByRole('button', { name: 'All' }).click()
  await expect(rows(page)).toHaveCount(6)
  await expect(recent(page).getByText('6 of 23')).toBeVisible()
})

test('Edit works on an older session reached through Show more', async ({ page }) => {
  await showMore(page).click()
  await rows(page).nth(15).getByRole('button', { name: /^Edit / }).click()
  await expect(page.getByText(/^Editing session · /)).toBeVisible()
})

test('Log home with the filter and Show more passes axe', async ({ page }) => {
  await showMore(page).click()
  await expect(rows(page)).toHaveCount(16)
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
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

  test('chips sit under the Recent title and Show more under the table, label-sized', async ({ page }) => {
    const title = await recent(page).getByRole('heading', { name: 'Recent sessions' }).boundingBox()
    const chips = await filter(page).boundingBox()
    const table = await recent(page).getByRole('list').boundingBox()
    const more = await showMore(page).boundingBox()
    expect(chips!.y).toBeGreaterThan(title!.y + title!.height - 1)
    expect(table!.y).toBeGreaterThan(chips!.y + chips!.height - 1)
    expect(more!.y).toBeGreaterThan(table!.y + table!.height - 1)
    expect(more!.width).toBeLessThan(table!.width / 2)
    // The chips wrap rather than scroll, so a focus ring is never clipped.
    expect(await filter(page).evaluate((el) => getComputedStyle(el).overflowX)).toBe('visible')
    await showMore(page).click()
    await expect(rows(page)).toHaveCount(16)
  })
})
