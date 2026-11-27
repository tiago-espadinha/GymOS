import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// Board "edit-plan" (D9) E1, F1, S1: Edit plan in the ⋯ sheet, the plan form prefilled,
// "Changes saved" after Save; renames carry into the plan's past sessions.
const plans = [
  {
    id: 'p1',
    name: 'Push day',
    desc: 'Heavy compounds first.',
    exercises: [
      { id: 'e1', name: 'Bench press', muscleGroup: 'Chest', trackWeight: true },
      { id: 'e2', name: 'Dips', muscleGroup: 'Chest' },
    ],
  },
  { id: 'p2', name: 'Legs', desc: '', exercises: [{ id: 'e3', name: 'Squat', muscleGroup: 'Legs' }] },
  { id: 'p3', name: 'Old block', desc: '', isArchived: true, archivedAt: '2026-10-01', exercises: [{ id: 'e4', name: 'Row', muscleGroup: 'Back' }] },
]
const set = { id: 'x', weight: '60', reps: '8', completed: true }
const logged = (id: string, date: string, planId: string, planName: string, ex: [string, string][]) => ({
  id,
  planId,
  planName,
  date,
  notes: '',
  exercises: ex.map(([exId, name]) => ({ id: exId, name, muscleGroup: 'Chest', sets: [set] })),
})
const sessions = [
  logged('s1', '2026-11-18', 'p1', 'Push day', [['e1', 'Bench press'], ['e2', 'Dips']]),
  logged('s2', '2026-11-21', 'p1', 'Push day', [['e1', 'Bench press']]),
  // Another plan's session with the same exercise name keeps it.
  logged('s3', '2026-11-20', 'p2', 'Legs', [['e9', 'Bench press']]),
]

// `refuse` names a storage key the browser refuses to write while sessionStorage says so.
const open = async (page: Page) => {
  await page.clock.setFixedTime(new Date('2026-11-25T10:00:00'))
  await page.addInitScript(
    ([p, s]) => {
      const setItem = Storage.prototype.setItem
      Storage.prototype.setItem = function (key: string, value: string) {
        if (sessionStorage.getItem('refuse') === key) throw new DOMException('Quota exceeded', 'QuotaExceededError')
        return setItem.call(this, key, value)
      }
      if (localStorage.getItem('gym:plans')) return
      localStorage.setItem('gym:plans', JSON.stringify(p))
      localStorage.setItem('gym:sessions', JSON.stringify(s))
    },
    [plans, sessions] as const,
  )
  await page.goto('/')
}

const stored = (page: Page, key: string) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '[]'), key)
const listRow = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(`^${name} \\d+ exercises?`) })
const form = (page: Page) => page.getByRole('form', { name: 'Edit plan' })
const axe = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
}

async function openEdit(page: Page, plan = 'Push day') {
  await page.getByRole('button', { name: `More actions for ${plan}` }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: /^Edit plan/ }).click()
  await expect(form(page)).toBeVisible()
}

async function renameBench(page: Page) {
  await form(page).getByRole('button', { name: /^Bench press/ }).click()
  await form(page).getByLabel('Exercise 1 name').fill('Barbell bench')
}

test.describe('phone', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('Edit plan opens the form filled in, collapsed, with Save changes and no tab bar', async ({ page }) => {
    await open(page)
    await listRow(page, 'Push day').click()
    await openEdit(page)

    await expect(page.getByRole('heading', { name: 'Edit plan', level: 1 })).toBeVisible()
    await expect(form(page).getByLabel('Name', { exact: true })).toHaveValue('Push day')
    await expect(form(page).getByLabel('Description · optional')).toHaveValue('Heavy compounds first.')
    await expect(form(page).locator('[data-exercise-header]')).toHaveText([/Bench press/, /Dips/])
    await expect(form(page).getByRole('button', { name: 'Save changes' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0)
    await axe(page)
  })

  test('renaming carries into this plan\'s sessions, Log and Stats, and survives a reload', async ({ page }) => {
    await open(page)
    // Stats shows Bench press, so its selection should follow the rename.
    await page.getByRole('navigation', { name: 'Main' }).getByText('Stats').click()
    await page.getByRole('button', { name: /^Exercise: / }).click()
    await page.getByRole('dialog').getByRole('searchbox', { name: 'Search exercises' }).fill('Bench press')
    await page.getByRole('option', { name: /^Bench press/ }).first().click()
    await expect(page.getByRole('button', { name: /^Exercise: Bench press/ })).toBeVisible()
    await page.getByRole('navigation', { name: 'Main' }).getByText('Plans').click()
    await listRow(page, 'Push day').click()
    await openEdit(page)
    await form(page).getByLabel('Name', { exact: true }).fill('Push A')
    await renameBench(page)
    await expect(form(page).getByText('2 renames carry into 2 past sessions and Stats.')).toBeVisible()
    await form(page).getByRole('button', { name: 'Save changes' }).click()

    await expect(page.getByText('Changes saved')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Push A', level: 1 })).toBeFocused()
    await expect(page.getByRole('region', { name: 'Push A' }).getByRole('listitem')).toHaveText([/Barbell bench/, /Dips/])

    await page.reload()
    const [storedPlans, storedSessions] = await Promise.all([stored(page, 'gym:plans'), stored(page, 'gym:sessions')])
    expect(storedPlans.map((p: { id: string; name: string }) => `${p.id} ${p.name}`)).toEqual(['p1 Push A', 'p2 Legs', 'p3 Old block'])
    expect(storedSessions.map((s: { planName: string; exercises: { name: string }[] }) => `${s.planName}: ${s.exercises.map((e) => e.name).join(', ')}`))
      .toEqual(['Push A: Barbell bench, Dips', 'Push A: Barbell bench', 'Legs: Bench press'])
    await expect(listRow(page, 'Push A')).toBeVisible()

    await page.getByRole('navigation', { name: 'Main' }).getByText('Log').click()
    await expect(page.getByRole('region', { name: 'Recent sessions' }).getByText('Push A')).toHaveCount(2)

    await page.getByRole('navigation', { name: 'Main' }).getByText('Stats').click()
    await expect(page.getByRole('button', { name: /^Exercise: Barbell bench/ })).toBeVisible()
    await page.getByRole('button', { name: /^Exercise: / }).click()
    const options = page.getByRole('dialog').getByRole('option')
    await expect(options.filter({ hasText: 'Barbell bench' })).toHaveCount(1)
    // Bench press stays only through the other plan's session.
    await expect(options.filter({ hasText: /^Bench press/ })).toHaveCount(1)
  })

  test('Cancel with changes asks first: Keep editing and Escape keep the edits, Discard leaves the plan as it was', async ({ page }) => {
    await open(page)
    await listRow(page, 'Push day').click()
    await openEdit(page)
    await form(page).getByLabel('Name', { exact: true }).fill('Push B')

    const cancel = form(page).getByRole('button', { name: 'Cancel' })
    await cancel.click()
    const confirm = page.getByRole('alertdialog', { name: 'Discard changes?' })
    await expect(confirm.getByText('Your edits are lost. Push day stays as it was.')).toBeVisible()
    await expect(confirm.getByRole('button', { name: 'Keep editing' })).toBeFocused()
    await axe(page)
    await confirm.getByRole('button', { name: 'Keep editing' }).click()
    await expect(confirm).toHaveCount(0)
    await expect(cancel).toBeFocused()
    await expect(form(page).getByLabel('Name', { exact: true })).toHaveValue('Push B')

    await cancel.click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(cancel).toBeFocused()
    await expect(form(page).getByLabel('Name', { exact: true })).toHaveValue('Push B')

    await cancel.click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Discard changes' }).click()
    await expect(form(page)).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Push day', level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'More actions for Push day' })).toBeFocused()
    expect((await stored(page, 'gym:plans'))[0].name).toBe('Push day')
  })

  test('Cancel without changes, or with a change typed and undone, closes at once', async ({ page }) => {
    await open(page)
    await openEdit(page)
    const name = form(page).getByLabel('Name', { exact: true })
    await name.fill('Push B')
    await name.fill('Push day')
    await form(page).getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(form(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'More actions for Push day' })).toBeFocused()
  })

  test('a refused save keeps the form and leaves plans and sessions as they were', async ({ page }) => {
    await open(page)
    await openEdit(page)
    await renameBench(page)
    await page.evaluate(() => sessionStorage.setItem('refuse', 'gym:plans'))
    await form(page).getByRole('button', { name: 'Save changes' }).click()

    await expect(page.getByRole('alert').filter({ hasText: 'This browser refused to store the plan' })).toBeVisible()
    await expect(form(page).getByRole('button', { name: 'Try again' })).toBeVisible()
    const storedSessions = await stored(page, 'gym:sessions')
    expect(storedSessions[0].exercises[0].name).toBe('Bench press')
    expect((await stored(page, 'gym:plans'))[0].exercises[0].name).toBe('Bench press')

    await page.evaluate(() => sessionStorage.removeItem('refuse'))
    await form(page).getByRole('button', { name: 'Try again' }).click()
    await expect(page.getByText('Changes saved')).toBeVisible()
    expect((await stored(page, 'gym:sessions'))[0].exercises[0].name).toBe('Barbell bench')
  })

  test('a refused sessions write keeps the form and stores nothing', async ({ page }) => {
    await open(page)
    await openEdit(page)
    await renameBench(page)
    await page.evaluate(() => sessionStorage.setItem('refuse', 'gym:sessions'))
    await form(page).getByRole('button', { name: 'Save changes' }).click()

    await expect(page.getByRole('alert').filter({ hasText: 'This browser refused to store the plan' })).toBeVisible()
    expect((await stored(page, 'gym:sessions'))[0].exercises[0].name).toBe('Bench press')
    expect((await stored(page, 'gym:plans'))[0].exercises[0].name).toBe('Bench press')
  })

  test('archived plans have no Edit', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: /^Archived · 1/ }).click()
    await expect(page.getByText('Old block')).toBeVisible()
    await expect(page.getByRole('button', { name: 'More actions for Old block' })).toHaveCount(0)
  })
})

test.describe('wide', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('editing from the pane returns to the panes with the plan selected, in place, and "Changes saved"', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: /^Legs/ }).click()
    await openEdit(page, 'Legs')
    const box = await form(page).boundingBox()
    expect(Math.round(box!.width)).toBeLessThanOrEqual(600)
    await form(page).getByLabel('Name', { exact: true }).fill('Legs A')
    await form(page).getByRole('button', { name: 'Save changes' }).click()

    await expect(page.getByText('Changes saved')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Legs A', level: 2 })).toBeVisible()
    const rows = page.getByRole('button', { name: /^(Push day|Legs A) \d+ exercises?/ })
    await expect(rows).toHaveText([/Push day/, /Legs A/])
    await expect(rows.nth(1)).toHaveAttribute('aria-current', 'true')
    await axe(page)
  })
})
