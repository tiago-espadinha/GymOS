import { expect, test, type Page } from '@playwright/test'

const longName = 'Upper body hypertrophy block A'.padEnd(60, 'x')
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
  {
    id: 'p3',
    name: 'Old block',
    desc: '',
    isArchived: true,
    archivedAt: '2024-10-12',
    exercises: [{ id: 'e5', name: 'Curl', muscleGroup: 'Biceps' }],
  },
]
const sessions = [
  { id: 's1', planId: 'p1', planName: 'Push day', date: '2024-05-02', notes: '', exercises: [] },
]

const seed = (page: Page, p: unknown[] = plans) =>
  page.addInitScript(
    ([p, s]) => {
      if (!localStorage.getItem('gym:plans')) localStorage.setItem('gym:plans', JSON.stringify(p))
      if (!localStorage.getItem('gym:sessions')) localStorage.setItem('gym:sessions', JSON.stringify(s))
    },
    [p, sessions] as const,
  )

const tabBar = (page: Page) => page.getByRole('navigation', { name: 'Main' })
const openActions = (page: Page, name: string) => page.getByRole('button', { name: `More actions for ${name}` }).click()
const archivedToggle = (page: Page) => page.getByRole('button', { name: /^Archived · \d+$/ })

test.describe('with plans', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page)
  })

  test('the title counts active plans; a row shows its exercise count and each group once', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('2 Plans')
    await expect(archivedToggle(page)).toHaveText(/Archived · 1/)
    await expect(page.getByText('3 exercises · Chest, Back')).toBeVisible()
    await expect(page.getByText('1 exercise · Legs')).toBeVisible()
  })

  test('Start opens the session for that plan, and a reload restores it', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-23T10:00:00'))
    await page.goto('/')
    await page.getByRole('button', { name: 'Start Push day' }).click()
    await expect(tabBar(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Bench press/ })).toBeVisible()
    // The session takes today's date.
    await expect(page.getByText('Mon 23 Nov · 0 sets')).toBeVisible()
    await page.reload()
    await expect(tabBar(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Bench press/ })).toBeVisible()
  })

  test('Create New replaces the list and hides the tab bar until Cancel', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Create New' }).click()
    await expect(page.getByPlaceholder('e.g. Push Day')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Plans', level: 1 })).toHaveCount(0)
    await expect(tabBar(page)).toHaveCount(0)
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(tabBar(page)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Plans', level: 1 })).toBeFocused()
  })

  test('⋯ opens a modal sheet with Edit and Archive; Escape closes it and returns focus', async ({ page }) => {
    await page.goto('/')
    await openActions(page, 'Push day')
    const sheet = page.getByRole('dialog', { name: 'Push day' })
    await expect(sheet).toBeVisible()
    await expect(sheet).toHaveAttribute('aria-modal', 'true')
    await expect(sheet.getByText('3 exercises · last trained 2 May')).toBeVisible()
    await expect(sheet.getByRole('button', { name: /Edit plan/ })).toBeFocused()
    await expect(sheet.getByRole('button', { name: /Archive plan/ })).toBeVisible()
    await expect(sheet.getByRole('button', { name: /Delete/ })).toHaveCount(0)
    await expect(page.locator('#root')).toHaveAttribute('inert', '')
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)
    await expect(page.locator('#root')).not.toHaveAttribute('inert', '')
    await expect(page.getByRole('button', { name: 'More actions for Push day' })).toBeFocused()
  })

  test('Close and a tap outside close the sheet without archiving', async ({ page }) => {
    await page.goto('/')
    await openActions(page, 'Push day')
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await openActions(page, 'Push day')
    await page.mouse.click(10, 10)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Start Push day' })).toBeVisible()
  })

  test('Archive moves the plan to Archived with an Undo toast; Undo puts it back in place', async ({ page }) => {
    await page.goto('/')
    await openActions(page, 'Push day')
    await page.getByRole('button', { name: /Archive plan/ }).click()
    const toast = page.getByRole('status').filter({ hasText: 'Push day archived' })
    await expect(toast).toBeVisible()
    await expect(page.getByRole('heading', { name: '1 Plan', level: 1 })).toBeFocused()
    await expect(page.getByRole('button', { name: 'Start Push day' })).toHaveCount(0)
    await expect(archivedToggle(page)).toHaveText(/Archived · 2/)
    await toast.getByRole('button', { name: 'Undo' }).click()
    await expect(toast).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Start / }).first()).toHaveAccessibleName('Start Push day')
    await expect(page.getByRole('button', { name: 'More actions for Push day' })).toBeFocused()
  })

  test('the toast goes after 6 seconds and the archive stays', async ({ page }) => {
    await page.clock.install()
    await page.goto('/')
    await openActions(page, 'Push day')
    await page.getByRole('button', { name: /Archive plan/ }).click()
    await page.mouse.move(0, 0)
    await page.clock.runFor(6100)
    await expect(page.getByRole('status').filter({ hasText: 'archived' })).toHaveCount(0)
    await page.reload()
    await expect(page.getByRole('button', { name: 'Start Push day' })).toHaveCount(0)
  })

  test('Archived is collapsed; open, it lists plans without Start and Restore returns them', async ({ page }) => {
    await page.goto('/')
    await expect(archivedToggle(page)).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByRole('button', { name: 'Restore Old block' })).toBeHidden()
    await archivedToggle(page).click()
    await expect(archivedToggle(page)).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByText('Archived 12 Oct 2024 · 1 exercise')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start Old block' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Restore Old block' }).click()
    await expect(page.getByRole('button', { name: 'Start Old block' })).toBeVisible()
    await expect(archivedToggle(page)).toHaveCount(0)
    await page.reload()
    await expect(page.getByRole('button', { name: 'Start Old block' })).toBeVisible()
  })

  test('Delete asks first; Keep it keeps the plan, Delete plan removes it for good', async ({ page }) => {
    await page.goto('/')
    await archivedToggle(page).click()
    await page.getByRole('button', { name: 'Delete Old block' }).click()
    const confirm = page.getByRole('alertdialog', { name: 'Delete Old block?' })
    await expect(confirm).toContainText("The plan and its 1 exercise are removed and can't be restored")
    await expect(confirm.getByRole('button', { name: 'Keep it' })).toBeFocused()
    await confirm.getByRole('button', { name: 'Keep it' }).click()
    await expect(page.getByRole('button', { name: 'Restore Old block' })).toBeVisible()

    await page.getByRole('button', { name: 'Delete Old block' }).click()
    await page.getByRole('button', { name: 'Delete plan' }).click()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(page.getByText('Old block')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Undo' })).toHaveCount(0)
    await page.reload()
    await expect(page.getByText('Old block')).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('2 Plans')
  })

  for (const width of [375, 768, 1280]) {
    test(`a long plan name stays on one line and does not overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/')
      const name = page.locator('.planRow__name', { hasText: longName })
      await expect(name).toBeVisible()
      const box = await name.evaluate((el) => ({ h: el.clientHeight, sw: el.scrollWidth, cw: el.clientWidth }))
      expect(box.sw).toBeGreaterThan(box.cw)
      expect(box.h).toBeLessThan(40)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }
})

test.describe('empty', () => {
  test('with no plans and no sessions the empty state offers Create New and Import', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('gym:sessions', '[]'))
    await seed(page, [])
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Plans')
    await expect(page.locator('.plansTabHeader')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'No plans yet' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create New' })).toHaveCount(1)
    await page.getByRole('button', { name: 'Have a CSV backup? Import it' }).click()
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible()
    await tabBar(page).getByText('Plans').click()
    await page.getByRole('button', { name: 'Create New' }).click()
    await expect(page.getByPlaceholder('e.g. Push Day')).toBeVisible()
  })

  test('with every plan archived the empty state shows above Archived', async ({ page }) => {
    await seed(page, [plans[2]])
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Plans')
    await expect(page.getByRole('heading', { name: 'No plans yet' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Have a CSV backup? Import it' })).toHaveCount(0)
    await expect(archivedToggle(page)).toBeVisible()
  })
  test('Cancel on the new-plan form from the empty state focuses the hidden Plans title', async ({ page }) => {
    await seed(page, [])
    await page.goto('/')
    await page.getByRole('button', { name: 'Create New' }).click()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('heading', { name: 'Plans', level: 1 })).toBeFocused()
  })
})
