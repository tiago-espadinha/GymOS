import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// Boards "B · Two panes · Plans" and "…, archived open and Undo": the plans on the left, the selected one on the right.
const ex = (id: string, name: string, muscleGroup: string, extra = {}) => ({ id, name, muscleGroup, ...extra })
const plans = [
  {
    id: 'p1',
    name: 'Back',
    desc: '',
    exercises: [
      ex('e1', 'Lat pulldown', 'Back'),
      ex('e2', 'Hammer curl', 'Biceps'),
      ex('e3', 'Dead hang', 'Back', { category: 'calisthenics', trackingType: 'time' }),
    ],
  },
  { id: 'p2', name: 'Legs', desc: '', exercises: [ex('e4', 'Squat', 'Legs'), ex('e5', 'Leg curl', 'Legs')] },
  { id: 'p3', name: 'Chest', desc: '', exercises: [ex('e6', 'Bench press', 'Chest')] },
  { id: 'p4', name: 'Old block', desc: '', isArchived: true, archivedAt: '2024-10-12', exercises: [ex('e7', 'Curl', 'Biceps')] },
]
const sessions = [{ id: 's1', planId: 'p1', planName: 'Back', date: '2026-11-04', notes: '', exercises: [] }]

const open = async (page: Page, p: unknown[] = plans) => {
  await page.clock.setFixedTime(new Date('2026-11-24T10:00:00'))
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

const pane = (page: Page) => page.locator('.plansPane')
const row = (page: Page, name: string) => pane(page).getByRole('button', { name: new RegExp(`^${name} `) })
const detail = (page: Page, name: string) => page.getByRole('region', { name })
const archivedToggle = (page: Page) => page.getByRole('button', { name: /^Archived · \d+$/ })
const axe = (page: Page) => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()

test.describe('at 1280', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false })

  test('the plans sit in the 440 pane and the first plan fills the right', async ({ page }) => {
    await open(page)
    expect(await pane(page).getByRole('list').first().boundingBox()).toMatchObject({ x: 40, width: 440 })
    const right = (await detail(page, 'Back').boundingBox())!
    expect(right.x).toBe(520)
    expect(right.x + right.width).toBe(1240)

    await expect(pane(page).getByText('3 plans · 1 archived')).toBeVisible()
    await expect(pane(page).getByRole('button', { name: '+ New plan' })).toBeVisible()
    await expect(row(page, 'Back')).toHaveAttribute('aria-current', 'true')
    await expect(row(page, 'Legs')).not.toHaveAttribute('aria-current')

    // The phone rows' Start and ⋯ give way to the detail's.
    await expect(page.getByRole('button', { name: /^Start / })).toHaveCount(1)
    await expect(page.getByRole('button', { name: /^More actions for / })).toHaveCount(1)

    const back = detail(page, 'Back')
    await expect(back.getByText('Plan · last trained 4 Nov')).toBeVisible()
    await expect(back.getByRole('heading', { level: 2, name: 'Back' })).toBeVisible()
    await expect(back.getByText('3 exercises · Back, Biceps')).toBeVisible()
    await expect(back.getByRole('listitem')).toHaveText([
      /Lat pulldown.*Strength · Back · weight × reps/,
      /Hammer curl.*Strength · Biceps · weight × reps/,
      /Dead hang.*Calisthenics · Back · time/,
    ])
    const start = (await back.getByRole('button', { name: 'Start Back' }).boundingBox())!
    expect(start.height).toBe(72)
    expect((await back.getByRole('button', { name: 'More actions for Back' }).boundingBox())!.height).toBe(72)
    expect(await axe(page).then((r) => r.violations)).toEqual([])
  })

  test('picking a row inverts it and shows that plan; it is not kept after a reload', async ({ page }) => {
    await open(page)
    await row(page, 'Legs').click()
    await expect(row(page, 'Legs')).toHaveAttribute('aria-current', 'true')
    await expect(row(page, 'Back')).not.toHaveAttribute('aria-current')
    await expect(row(page, 'Legs')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(row(page, 'Legs').locator('svg')).toBeVisible()
    await expect(detail(page, 'Legs').getByText('Plan · not trained yet')).toBeVisible()
    await expect(detail(page, 'Legs').getByRole('listitem')).toHaveCount(2)
    await page.reload()
    await expect(row(page, 'Back')).toHaveAttribute('aria-current', 'true')
  })

  test('Start begins a session with the selected plan', async ({ page }) => {
    await open(page)
    await row(page, 'Legs').click()
    await detail(page, 'Legs').getByRole('button', { name: 'Start Legs' }).click()
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Squat/ })).toBeVisible()
  })

  test('⋯ opens the actions sheet at 560; Archive selects the next plan and Undo brings it back', async ({ page }) => {
    await open(page)
    await row(page, 'Legs').click()
    await detail(page, 'Legs').getByRole('button', { name: 'More actions for Legs' }).click()
    const sheet = page.getByRole('dialog', { name: 'Legs' })
    expect((await sheet.boundingBox())!.width).toBe(560)
    await sheet.getByRole('button', { name: /Archive plan/ }).click()

    const toast = page.getByRole('status').filter({ hasText: 'Legs archived' })
    await expect(toast).toBeVisible()
    expect(await toast.boundingBox()).toMatchObject({ x: 40, width: 440 })
    await expect(row(page, 'Legs')).toHaveCount(0)
    await expect(row(page, 'Chest')).toHaveAttribute('aria-current', 'true')
    await expect(detail(page, 'Chest')).toBeVisible()
    expect(await axe(page).then((r) => r.violations)).toEqual([])

    await toast.getByRole('button', { name: 'Undo' }).click()
    await expect(row(page, 'Legs')).toHaveAttribute('aria-current', 'true')
    await expect(detail(page, 'Legs').getByRole('button', { name: 'More actions for Legs' })).toBeFocused()
  })

  test('an open sheet and the toast stay when the window crosses 1024; closing focuses that plan\'s ⋯', async ({ page }) => {
    await open(page)
    await row(page, 'Legs').click()
    await detail(page, 'Legs').getByRole('button', { name: 'More actions for Legs' }).click()
    await page.setViewportSize({ width: 768, height: 1024 })
    const sheet = page.getByRole('dialog', { name: 'Legs' })
    await expect(sheet).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'More actions for Legs' })).toBeFocused()

    await page.getByRole('button', { name: 'More actions for Back' }).click()
    await page.getByRole('button', { name: /Archive plan/ }).click()
    const toast = page.getByRole('status').filter({ hasText: 'Back archived' })
    const undo = toast.getByRole('button', { name: 'Undo' })
    await undo.evaluate((el) => el.setAttribute('data-mark', '1'))
    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(toast).toBeVisible()
    await expect(undo).toHaveAttribute('data-mark', '1')
  })

  test('archiving the last plan in the list selects the one before it', async ({ page }) => {
    await open(page)
    await row(page, 'Chest').click()
    await detail(page, 'Chest').getByRole('button', { name: 'More actions for Chest' }).click()
    await page.getByRole('button', { name: /Archive plan/ }).click()
    await expect(row(page, 'Legs')).toHaveAttribute('aria-current', 'true')
  })

  test('Archived opens in the pane; Restore shows the plan and Delete asks first', async ({ page }) => {
    await open(page)
    await archivedToggle(page).click()
    await expect(pane(page).getByText('Archived 12 Oct 2024 · 1 exercise')).toBeVisible()
    await page.getByRole('button', { name: 'Restore Old block' }).click()
    await expect(row(page, 'Old block')).toHaveAttribute('aria-current', 'true')
    await expect(detail(page, 'Old block')).toBeVisible()

    await detail(page, 'Old block').getByRole('button', { name: 'More actions for Old block' }).click()
    await page.getByRole('button', { name: /Archive plan/ }).click()
    await page.getByRole('button', { name: 'Delete Old block' }).click()
    const confirm = page.getByRole('alertdialog', { name: 'Delete Old block?' })
    await expect(confirm).toBeVisible()
    expect(await axe(page).then((r) => r.violations)).toEqual([])
    await confirm.getByRole('button', { name: 'Delete plan' }).click()
    await expect(page.getByRole('button', { name: 'Delete Old block' })).toHaveCount(0)
    await expect(row(page, 'Old block')).toHaveCount(0)
  })

  test('with no active plans the phone column stays, Archived included', async ({ page }) => {
    await open(page, [plans[3]])
    await expect(page.locator('.plansTab--wide')).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'No training plans yet' })).toBeVisible()
    expect(await page.locator('.mainContent').boundingBox()).toMatchObject({ x: 340, width: 600 })
    await expect(archivedToggle(page)).toBeVisible()
  })

  test('+ New plan opens the form in the phone column and Cancel returns to the panes', async ({ page }) => {
    await open(page)
    await pane(page).getByRole('button', { name: '+ New plan' }).click()
    await expect(page.locator('.plansTab--wide')).toHaveCount(0)
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(pane(page)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Plans', level: 1 })).toBeFocused()
  })
})

test.describe('at 1024', () => {
  test.use({ viewport: { width: 1024, height: 768 }, isMobile: false, hasTouch: false })

  test('two panes without sideways scroll', async ({ page }) => {
    await open(page)
    await expect(pane(page)).toBeVisible()
    await expect(detail(page, 'Back')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1024)
  })
})

test.describe('at 768', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('the phone list stays, with Start and ⋯ on every row', async ({ page }) => {
    await open(page)
    await expect(pane(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Start / })).toHaveCount(3)
  })
})
