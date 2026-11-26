import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { finishButton, logSet, sessionActions } from './log-set'

// The session list's ⋯ opens the session sheet: Discard session for a new session;
// Change date, Discard changes and Delete session for an edited one. Done is a save step.
const plans = [
  { id: 'p1', name: 'Push', desc: '', exercises: [{ id: 'e1', name: 'Bench Press', muscleGroup: 'Chest' }] },
]
const sessions = [
  {
    id: 's1',
    planId: 'p1',
    planName: 'Push',
    date: '2026-11-10',
    notes: '',
    exercises: [
      {
        id: 'e1',
        name: 'Bench Press',
        muscleGroup: 'Chest',
        sets: [
          { id: 'a', weight: '60', reps: '10' },
          { id: 'b', weight: '60', reps: '8' },
        ],
      },
    ],
  },
]

const ACCENT = 'rgb(198, 255, 61)'

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-15T10:00:00') })
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

const axe = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(violations).toEqual([])
}

const sheet = (page: Page) => page.getByRole('dialog', { name: 'Push' })

const startNew = async (page: Page) => {
  await page.getByRole('button', { name: 'Start', exact: true }).click()
}

const editSaved = async (page: Page) => {
  await page.getByRole('button', { name: /^Edit Push/ }).click()
}

test('a new session: one Finish beside a 44 ⋯, the hint while Finish is disabled, no Cancel or second Finish', async ({ page }) => {
  await startNew(page)
  const more = sessionActions(page)
  const box = await more.boundingBox()
  expect(box?.width).toBe(44)
  expect(box?.height).toBe(44)
  await expect(finishButton(page)).toBeDisabled()
  await expect(page.getByText('Log a set to finish.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Finish/ })).toHaveCount(1)
  // The ⋯ sits beside Finish, on the same row.
  const finish = await finishButton(page).boundingBox()
  expect(Math.abs((finish?.y ?? 0) - (box?.y ?? 0))).toBeLessThanOrEqual(1)
  expect(box!.x).toBeLessThan(finish!.x)
})

test('the new-session sheet: accent block, Discard session and an outlined Close; Escape and Close return to ⋯', async ({ page }) => {
  await startNew(page)
  await page.getByRole('button', { name: /^Bench Press/ }).click()
  await logSet(page, '60', '8')
  await page.getByRole('button', { name: 'All exercises' }).click()

  await sessionActions(page).click()
  await expect(sheet(page)).toBeVisible()
  await expect(sheet(page).locator('.sessionSheet__head')).toHaveCSS('background-color', ACCENT)
  await expect(sheet(page).locator('.sessionSheet__head')).toContainText('Session · Sun 15 Nov')
  await expect(sheet(page).locator('.sessionSheet__head')).toContainText('1 set logged')
  await expect(sheet(page).getByRole('button')).toHaveText([/^Discard session/, 'Close'])
  await axe(page)

  await page.keyboard.press('Escape')
  await expect(sheet(page)).toHaveCount(0)
  await expect(sessionActions(page)).toBeFocused()

  await sessionActions(page).click()
  await sheet(page).getByRole('button', { name: 'Close' }).click()
  await expect(sheet(page)).toHaveCount(0)
  await expect(sessionActions(page)).toBeFocused()
})

test('editing: accent kicker instead of the banner; the sheet changes date, and Done saves the new date', async ({ page }) => {
  await editSaved(page)
  const kicker = page.getByText('Editing · Tue 10 Nov · 2 sets')
  await expect(kicker).toBeVisible()
  await expect(kicker).toHaveCSS('color', ACCENT)
  await expect(page.getByText('✏')).toHaveCount(0)

  await sessionActions(page).click()
  await expect(sheet(page).locator('.sessionSheet__head')).toContainText('Editing · saved Tue 10 Nov')
  await expect(sheet(page).locator('.sessionSheet__head')).toContainText('2 sets · 1,080 kg')
  await expect(sheet(page).getByRole('button')).toHaveText([/^Change date/, /^Discard changes/, /^Delete session/, 'Close'])
  await axe(page)

  const change = sheet(page).getByRole('button', { name: /^Change date/ })
  await change.click()
  const dates = page.getByRole('dialog', { name: 'Session date' })
  await dates.getByLabel('Another day').fill('09/11/2026')
  await dates.getByRole('button', { name: 'Close' }).click()
  await expect(change).toBeFocused()
  await expect(change).toContainText('Mon 9 Nov')
  await sheet(page).getByRole('button', { name: 'Close' }).click()
  await expect(page.getByText('Editing · Mon 9 Nov · 2 sets')).toBeVisible()

  await finishButton(page).click()
  await expect(page.getByRole('button', { name: /^Session date: / })).toHaveText(/Mon 9 Nov/)
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible()
  await axe(page)
  await page.getByRole('button', { name: 'Save changes' }).click()
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('gym:sessions') ?? '[]'))
  expect(stored[0].date).toBe('2026-11-09')
})

test('Done for a new session: Session back link on top, Save session the only action, and back returns focus to Finish', async ({ page }) => {
  await startNew(page)
  await page.getByRole('button', { name: /^Bench Press/ }).click()
  await logSet(page, '60', '8')
  await page.getByRole('button', { name: 'All exercises' }).click()
  await finishButton(page).click()

  await expect(page.locator('.finishKicker')).toHaveText('Push · Sun 15 Nov')
  const back = page.getByRole('button', { name: 'Session', exact: true })
  const hero = await page.locator('.finishHero').boundingBox()
  expect((await back.boundingBox())!.y).toBeLessThan(hero!.y)
  // ‹ Session, then Save session: nothing else to press.
  await expect(page.getByRole('main').getByRole('button')).toHaveText(['Session', 'Save session'])
  await axe(page)

  await back.click()
  await expect(finishButton(page)).toBeFocused()
})

test('the edit-set panel: Save set N, then Cancel on the left and Delete set N on the right in the danger colour', async ({ page }) => {
  await startNew(page)
  await page.getByRole('button', { name: /^Bench Press/ }).click()
  await logSet(page, '60', '8')
  await page.getByRole('button', { name: 'End rest' }).click()
  await page.getByRole('button', { name: 'Edit set 1' }).click()

  const save = await page.getByRole('button', { name: 'Save set 1' }).boundingBox()
  const cancel = page.getByRole('button', { name: 'Cancel', exact: true })
  const del = page.getByRole('button', { name: 'Delete set 1' })
  const c = (await cancel.boundingBox())!
  const d = (await del.boundingBox())!
  expect(c.y).toBeGreaterThan(save!.y)
  expect(c.x).toBeLessThan(d.x)
  await expect(cancel).toHaveCSS('color', 'rgb(180, 180, 180)')
  await expect(del).toHaveCSS('color', 'rgb(255, 138, 122)')
})
