import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { finishButton, logSet } from './log-set'

const plans = [
  { id: 'p1', name: 'Push day', desc: '', exercises: [{ id: 'e1', name: 'Bench press', muscleGroup: 'Chest' }] },
  { id: 'p2', name: 'Old block', desc: '', isArchived: true, exercises: [{ id: 'e2', name: 'Curl', muscleGroup: 'Biceps' }] },
]

// Newest first, as the app stores them. Eight sessions so the cap of six is visible.
const sessions = Array.from({ length: 8 }, (_, i) => ({
  id: `s${i}`,
  planId: 'p1',
  planName: `Session ${i}`,
  date: `2026-11-${String(16 - i).padStart(2, '0')}`,
  notes: i === 0 ? 'Felt strong, new bench PR' : '',
  exercises: [
    {
      id: 'e1',
      name: 'Bench press',
      muscleGroup: 'Chest',
      sets: [
        { id: 'a', weight: '60', reps: '10' },
        { id: 'b', weight: '60', reps: '8' },
      ],
    },
  ],
}))

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ([p, s]) => {
      if (localStorage.getItem('gym:plans')) return
      localStorage.setItem('gym:plans', JSON.stringify(p))
      localStorage.setItem('gym:sessions', JSON.stringify(s))
    },
    [plans, sessions],
  )
})

const openLog = async (page: Page) => {
  await page.goto('/')
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Log' }).click()
}

const planButton = (page: Page) => page.getByRole('button', { name: /^Training plan: / })
const dateButton = (page: Page) => page.getByRole('button', { name: /^Session date: / })
const isoDaysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)
const metaDate = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '')

test('Log home starts on the newest session\'s plan and Start starts it today', async ({ page }) => {
  await openLog(page)
  await expect(planButton(page)).toHaveText(/Push day/)
  await expect(page.getByText('1 exercise · last trained 16 Nov')).toBeVisible()
  await expect(dateButton(page)).toContainText(metaDate(isoDaysAgo(0)))
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Push day', level: 1 })).toBeVisible()
})

test('the plan picker lists active plans only, keyboard first, and the pick is what Start starts', async ({ page }) => {
  await page.addInitScript(() => {
    const p = JSON.parse(localStorage.getItem('gym:plans') ?? '[]')
    if (p.length === 2) {
      p.push({ id: 'p3', name: 'Leg day', desc: '', exercises: [{ id: 'e3', name: 'Squat', muscleGroup: 'Legs' }] })
      localStorage.setItem('gym:plans', JSON.stringify(p))
    }
  })
  await openLog(page)
  await planButton(page).click()
  const picker = page.getByRole('dialog', { name: 'Pick a plan' })
  // Full screen: the tab bar is covered, not just made inert.
  const covered = await page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight - 10)
    return Boolean(el?.closest('[role="dialog"]'))
  })
  expect(covered).toBe(true)
  const options = picker.getByRole('option')
  await expect(options).toHaveCount(2)
  await expect(options.first()).toContainText('Push day1 exercise · last 16 Nov')
  await expect(options.last()).toContainText('Leg day1 exercise · not trained yet')
  await expect(options.first()).toBeFocused()
  await expect(picker.getByText("Archived plans aren't listed. Restore one from Plans.")).toBeVisible()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(picker).toHaveCount(0)
  await expect(planButton(page)).toBeFocused()
  await expect(planButton(page)).toHaveText(/Leg day/)
  await expect(page.getByText('1 exercise · not trained yet')).toBeVisible()
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Leg day', level: 1 })).toBeVisible()
})

test('the date sheet picks Yesterday or another past day for Start', async ({ page }) => {
  await openLog(page)
  await dateButton(page).click()
  const sheet = page.getByRole('dialog', { name: 'Session date' })
  await expect(sheet.getByRole('button', { name: /^Today/ })).toHaveAttribute('aria-pressed', 'true')
  await sheet.getByRole('button', { name: /^Yesterday/ }).click()
  await expect(sheet).toHaveCount(0)
  await expect(dateButton(page)).toContainText(metaDate(isoDaysAgo(1)))

  await dateButton(page).click()
  await expect(sheet.getByRole('button', { name: /^Yesterday/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(sheet.getByLabel('Another day')).toHaveAttribute('max', isoDaysAgo(0))
  await sheet.getByLabel('Another day').fill('2026-11-01')
  await sheet.getByRole('button', { name: 'Close' }).click()
  await expect(dateButton(page)).toContainText('Sun 1 Nov')
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.getByText('Sun 1 Nov · 0 sets')).toBeVisible()
  // The date is picked before starting only.
  await expect(page.locator('input[type="date"]')).toHaveCount(0)
})

test('Recent shows the six newest sessions with sets, volume and notes', async ({ page }) => {
  await openLog(page)
  const rows = page.getByRole('region', { name: 'Recent sessions' }).getByRole('listitem')
  await expect(rows).toHaveCount(6)
  await expect(rows.first()).toContainText('Session 0')
  await expect(rows.first()).toContainText('2 sets · 1,080 kg · Felt strong, new bench PR')
  await expect(rows.first()).toContainText('Felt strong, new bench PR')
  await expect(rows.last()).toContainText('Session 5')
})

test('Edit opens the saved session and is at least 44px tall', async ({ page }) => {
  await openLog(page)
  const edit = page.getByRole('button', { name: /^Edit Session 0/ })
  expect((await edit.boundingBox())?.height).toBeGreaterThanOrEqual(44)
  await edit.click()
  await expect(page.getByText(/^Editing session · /)).toBeVisible()
  await expect(finishButton(page)).toBeVisible()
})

test('editing a saved session: plan title, date sheet, multi-line notes and Update session', async ({ page }) => {
  await openLog(page)
  await page.getByRole('button', { name: /^Edit Session 0/ }).click()
  await expect(page.locator('input[type="date"]')).toHaveCount(0)
  await finishButton(page).click()
  await expect(page.getByRole('heading', { name: 'Session 0', level: 1 })).toBeFocused()
  const date = page.getByRole('button', { name: /^Session date: / })
  await expect(date).toHaveText(/Saved 16 Nov 2026/)
  await expect(page.getByRole('button', { name: 'Back to logging' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Discard changes' })).toBeVisible()
  await date.click()
  const sheet = page.getByRole('dialog', { name: 'Session date' })
  await sheet.getByLabel('Another day').fill('2026-11-10')
  await sheet.getByRole('button', { name: 'Close' }).click()
  await expect(date).toHaveText(/Saved 10 Nov 2026/)
  await expect(date).toBeFocused()
  await page.getByLabel('Notes · optional').fill('Felt strong\nGrip gave out on the last set.')
  await page.getByRole('button', { name: 'Update session' }).click()
  await expect(page.getByRole('region', { name: 'Recent sessions' }).getByRole('listitem').first()).toContainText(
    'Just updatedSession 010 Nov 2026',
  )
  await page.reload()
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('gym:sessions') ?? '[]'))
  const s0 = stored.find((s: { id: string }) => s.id === 's0')
  expect(s0.date).toBe('2026-11-10')
  expect(s0.notes).toBe('Felt strong\nGrip gave out on the last set.')
})

test('a new session has no date field on Finish', async ({ page }) => {
  await openLog(page)
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.getByRole('button', { name: /^Bench press/ }).click()
  await logSet(page, '', '8')
  await page.getByRole('button', { name: 'All exercises' }).click()
  await finishButton(page).click()
  await expect(page.getByLabel('Session date')).toHaveCount(0)
})

test('Recent rows offer Edit only; Delete session on the editing Finish confirms in a danger sheet', async ({ page }) => {
  await openLog(page)
  const rows = page.getByRole('region', { name: 'Recent sessions' }).getByRole('listitem')
  await expect(rows.first().getByRole('button')).toHaveText(['Edit'])
  await page.getByRole('button', { name: /^Edit Session 0/ }).click()
  await finishButton(page).click()
  await expect(page.getByRole('button', { name: 'Delete session' })).toBeVisible()

  await page.getByRole('button', { name: 'Delete session' }).click()
  const confirm = page.getByRole('alertdialog', { name: 'Delete Session 0, 16 Nov 2026?' })
  await expect(confirm.getByRole('button', { name: 'Keep it' })).toBeFocused()
  await axe(page)
  await confirm.getByRole('button', { name: 'Keep it' }).click()
  await expect(confirm).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Session 0', level: 1 })).toBeVisible()

  await page.getByRole('button', { name: 'Delete session' }).click()
  await confirm.getByRole('button', { name: 'Delete session' }).click()
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Session 0 session deleted' })).toHaveCount(1)
  await expect(rows).toHaveCount(6)
  await expect(rows.first()).toContainText('Session 1')
  await expect(rows.last()).toContainText('Session 6')
  await page.reload()
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('gym:sessions') ?? '[]'))
  expect(stored.map((s: { id: string }) => s.id)).not.toContain('s0')
})

test('the editing Finish passes axe', async ({ page }) => {
  await openLog(page)
  await page.getByRole('button', { name: /^Edit Session 0/ }).click()
  await finishButton(page).click()
  await expect(page.getByRole('heading', { name: 'Session 0', level: 1 })).toBeVisible()
  await axe(page)
})

const axe = async (page: Page) => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
}

test('Log home, the plan picker and the date sheet have no detectable WCAG A/AA violations', async ({ page }) => {
  await openLog(page)
  await expect(page.getByRole('heading', { name: 'Recent sessions' })).toBeVisible()
  await axe(page)
  await planButton(page).click()
  await expect(page.getByRole('dialog', { name: 'Pick a plan' })).toBeVisible()
  await axe(page)
  await page.getByRole('button', { name: 'Close' }).click()
  await dateButton(page).click()
  await expect(page.getByRole('dialog', { name: 'Session date' })).toBeVisible()
  await axe(page)
})

test.describe('empty', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  const seed = (page: Page, p: unknown[], s: unknown[]) =>
    page.addInitScript(
      ([pp, ss]) => {
        localStorage.setItem('gym:plans', JSON.stringify(pp))
        localStorage.setItem('gym:sessions', JSON.stringify(ss))
      },
      [p, s],
    )

  test('with no plans, + New plan opens New plan and Import it opens Data', async ({ page }) => {
    await seed(page, [], [])
    await openLog(page)
    await expect(page.getByRole('heading', { name: 'No plans yet' })).toBeVisible()
    await expect(page.getByText('Sessions you save show up here.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start', exact: true })).toHaveCount(0)
    await axe(page)
    await page.getByRole('button', { name: '+ New plan' }).click()
    await expect(page.getByLabel('Name', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Log' }).click()
    await page.getByRole('button', { name: 'Have a CSV backup? Import it' }).click()
    await expect(page.getByRole('heading', { name: 'Data', level: 1 })).toBeVisible()
  })

  test('with plans but no sessions, Recent says where the first one lands', async ({ page }) => {
    await seed(page, [plans[0]], [])
    await openLog(page)
    await expect(page.getByText('1 exercise · not trained yet')).toBeVisible()
    await expect(
      page.getByText('No sessions yet. Your first one lands here after you press Start and save it.'),
    ).toBeVisible()
  })
})
