import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { finishButton, logSet } from './log-set'

const names = ['Lat pulldown', 'Machine row', 'Seated cable row', 'Face pull', 'Hammer curl', 'Back extension']
const back = {
  id: 'p1',
  name: 'Back',
  desc: '',
  exercises: names.map((name, i) => ({ id: `e${i}`, name, muscleGroup: 'Back' })),
}
const short = { id: 'p2', name: 'Arms', desc: '', exercises: [{ id: 'a1', name: 'Curl', muscleGroup: 'Biceps' }] }

// Newest first. Eight, so the table shows "6 of 8".
const sessions = Array.from({ length: 8 }, (_, i) => ({
  id: `s${i}`,
  planId: 'p1',
  planName: 'Back',
  date: `2026-11-${String(16 - i).padStart(2, '0')}`,
  notes: i === 0 ? 'Grip gave out on the last curl set.' : '',
  exercises: [{ id: 'e0', name: 'Lat pulldown', muscleGroup: 'Back', sets: [{ id: 'a', weight: '50', reps: '10' }, { id: 'b', weight: '50', reps: '8' }] }],
}))

const seed = (page: Page, plans: unknown[], saved: unknown[]) =>
  page.addInitScript(
    ([p, s]) => {
      if (localStorage.getItem('gym:plans')) return
      localStorage.setItem('gym:plans', JSON.stringify(p))
      localStorage.setItem('gym:sessions', JSON.stringify(s))
      localStorage.setItem('gym:tab', JSON.stringify('log'))
    },
    [plans, saved],
  )

const newSession = (page: Page) => page.getByRole('region', { name: 'New session' })
const recent = (page: Page) => page.getByRole('region', { name: 'Recent sessions' })
const rows = (page: Page) => recent(page).getByRole('listitem')
const axe = (page: Page) =>
  new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()

test.describe('wide, 1280', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false })

  test('New session sits in the 440 left pane and Recent sessions fills the right', async ({ page }) => {
    await seed(page, [back, short], sessions)
    await page.goto('/')
    const left = (await newSession(page).boundingBox())!
    expect(left).toMatchObject({ x: 40, width: 440 })
    const right = (await recent(page).boundingBox())!
    expect(right).toMatchObject({ x: 520, width: 720 })
    expect(right.y).toBe(left.y)

    const list = newSession(page).getByRole('list', { name: 'Back exercises' }).getByRole('listitem')
    await expect(list).toHaveText(names.slice(0, 4))
    await expect(newSession(page).getByText('+ 2 more', { exact: true })).toBeVisible()
    // The name picks the plan, as on a phone, so START has the pane to itself.
    await expect(newSession(page).getByRole('button', { name: 'Change plan' })).toHaveCount(0)
    await expect(newSession(page).getByRole('button', { name: /^Training plan: / }).locator('svg')).toBeVisible()
    const start = (await newSession(page).getByRole('button', { name: 'Start', exact: true }).boundingBox())!
    expect(start).toMatchObject({ x: left.x + 24, width: left.width - 48, height: 72 })
  })

  test('Recent sessions is a table of name, date, sets, volume, notes and Edit', async ({ page }) => {
    await seed(page, [back], sessions)
    await page.goto('/')
    await expect(recent(page).getByText('6 of 8')).toBeVisible()
    await expect(rows(page)).toHaveCount(6)
    const first = rows(page).first()
    expect((await first.boundingBox())!.height).toBeGreaterThanOrEqual(72)
    const cells = ['Back', '16 Nov 2026', '2 sets', '900 kg', 'Grip gave out on the last curl set.']
    const xs: number[] = []
    for (const text of cells) {
      const cell = first.getByText(text, { exact: true })
      await expect(cell).toBeVisible()
      xs.push((await cell.boundingBox())!.x)
    }
    expect(xs).toEqual([...xs].sort((a, b) => a - b))
    const edit = (await first.getByRole('button', { name: /^Edit Back/ }).boundingBox())!
    expect(edit.x + edit.width).toBe(1240)
    expect(edit.width).toBeGreaterThanOrEqual(44)
    await expect(first.locator('.logHomeItemSummary')).toBeHidden()
  })

  test('the plan picker and the date sheet open from the left pane', async ({ page }) => {
    await seed(page, [back, short], sessions)
    await page.goto('/')
    await newSession(page).getByRole('button', { name: /^Training plan: / }).click()
    // The picker is full screen; its list keeps the 600 column.
    const picker = page.getByRole('dialog')
    expect(await picker.getByRole('listbox').boundingBox()).toMatchObject({ x: 340, width: 600 })
    expect((await axe(page)).violations.map((v) => v.id)).toEqual([])
    await picker.getByRole('option', { name: /Arms/ }).click()
    await expect(newSession(page).getByRole('list', { name: 'Arms exercises' }).getByRole('listitem')).toHaveText(['Curl'])

    await page.getByRole('button', { name: /^Session date: / }).click()
    expect((await page.getByRole('dialog').boundingBox())!.width).toBe(560)
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('no plans and no sessions show the empty block with Import and no Recent', async ({ page }) => {
    await seed(page, [], [])
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'No sessions yet' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Have a CSV backup? Import it' })).toBeVisible()
    await expect(recent(page)).toHaveCount(0)
    expect(await page.locator('.emptyState').boundingBox()).toMatchObject({ x: 400, width: 480 })
    expect((await axe(page)).violations.map((v) => v.id)).toEqual([])
  })

  test('a plan with no sessions shows the first-session hint and no "+ n more"', async ({ page }) => {
    await seed(page, [short], [])
    await page.goto('/')
    await expect(recent(page).getByText(/^No sessions yet/)).toBeVisible()
    await expect(newSession(page).getByText(/more$/)).toHaveCount(0)
  })

  test('the session just saved is marked in the table', async ({ page }) => {
    await seed(page, [short], [])
    await page.goto('/')
    await page.getByRole('button', { name: 'Start', exact: true }).click()
    await page.getByRole('button', { name: /^Curl/ }).click()
    await logSet(page, '12', '10')
    await page.getByRole('button', { name: 'All exercises' }).click()
    await finishButton(page).click()
    await page.getByRole('button', { name: 'Save session' }).click()

    const saved = rows(page).first()
    await expect(saved).toHaveClass(/logHomeItem--saved/)
    await expect(saved.getByText('Just saved')).toBeVisible()
    await expect(saved.getByText('120 kg', { exact: true })).toBeVisible()
    expect((await saved.boundingBox())!.x).toBe(504)
    expect((await axe(page)).violations.map((v) => v.id)).toEqual([])
  })
})

test.describe('narrowest wide, 1024', () => {
  test.use({ viewport: { width: 1024, height: 768 }, isMobile: false, hasTouch: false })

  test('the table shrinks into its pane without a horizontal scroll', async ({ page }) => {
    await seed(page, [back], sessions)
    await page.goto('/')
    await expect(rows(page)).toHaveCount(6)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1024)
    const edit = (await rows(page).first().getByRole('button', { name: /^Edit Back/ }).boundingBox())!
    expect(edit.x + edit.width).toBe(984)
  })

  test('a long plan name keeps its chevron at the right edge of the pane', async ({ page }) => {
    const long = { ...back, name: 'Upper body hypertrophy and conditioning block' }
    await seed(page, [long], sessions)
    await page.goto('/')
    const block = (await newSession(page).boundingBox())!
    const chevron = (await newSession(page).getByRole('button', { name: /^Training plan: / }).locator('svg').boundingBox())!
    expect(chevron.x + chevron.width).toBe(block.x + block.width - 24)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1024)
  })

  test('the plan name shows a dark focus ring on the lime block', async ({ page }) => {
    await seed(page, [back], sessions)
    await page.goto('/')
    const name = newSession(page).getByRole('button', { name: /^Training plan: / })
    await name.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    const ring = await name.evaluate((el) => [getComputedStyle(el).outlineStyle, getComputedStyle(el).outlineColor])
    const onAccent = await name.evaluate((el) => getComputedStyle(el).color)
    expect(ring).toEqual(['solid', onAccent])
  })
})

test.describe('below wide, 768', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('Log home keeps the phone column without the wide-only parts, count included', async ({ page }) => {
    await seed(page, [back], sessions)
    await page.goto('/')
    await expect(newSession(page).getByRole('button', { name: 'Start', exact: true })).toBeVisible()
    await expect(newSession(page).getByRole('list')).toBeHidden()
    await expect(recent(page).getByText('6 of 8')).toBeVisible()
    expect(await page.locator('.mainContent').boundingBox()).toMatchObject({ x: 84, width: 600 })
  })
})
