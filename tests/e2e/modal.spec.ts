import { expect, test, type Page } from '@playwright/test'
import { finishButton } from './log-set'

const plans = [
  { id: 'p1', name: 'Push day', desc: '', exercises: [{ id: 'e1', name: 'Bench press', muscleGroup: 'Chest' }] },
  { id: 'p2', name: 'Leg day', desc: '', exercises: [{ id: 'e2', name: 'Squat', muscleGroup: 'Legs' }] },
]

test.beforeEach(async ({ page }) => {
  await page.addInitScript((p) => {
    if (!localStorage.getItem('gym:plans')) localStorage.setItem('gym:plans', JSON.stringify(p))
  }, plans)
})

const openLog = async (page: Page) => {
  await page.goto('/')
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Log' }).click()
}

const dateButton = (page: Page) => page.getByRole('button', { name: /^Session date: / })
const dateSheet = (page: Page) => page.getByRole('dialog', { name: 'Session date' })

/** The centre of an element, read before a sheet covers the page. */
const centre = async (page: Page, name: string) => {
  const box = (await page.getByRole('button', { name, exact: true }).boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

test('a click outside a sheet only dismisses it; the control behind does not act', async ({ page }) => {
  await openLog(page)
  const start = await centre(page, 'Start')
  await dateButton(page).click()
  await expect(dateSheet(page)).toBeVisible()
  const sheetTop = (await dateSheet(page).boundingBox())!.y
  expect(start.y).toBeLessThan(sheetTop)

  await page.mouse.click(start.x, start.y)
  await expect(dateSheet(page)).toHaveCount(0)
  // Still on Log home: Start did not begin a session.
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible()
  await expect(finishButton(page)).toHaveCount(0)
})

test('a tap outside a sheet only dismisses it', async ({ page }) => {
  await openLog(page)
  const start = await centre(page, 'Start')
  await dateButton(page).click()
  await expect(dateSheet(page)).toBeVisible()
  await page.touchscreen.tap(start.x, start.y)
  await expect(dateSheet(page)).toHaveCount(0)
  await expect(finishButton(page)).toHaveCount(0)
})

test('the page behind an open sheet is inert, and Tab stays inside the sheet', async ({ page }) => {
  await openLog(page)
  await dateButton(page).click()
  const sheet = dateSheet(page)
  await expect(sheet.getByRole('button', { name: /^Today/ })).toBeFocused()
  const inert = await page.evaluate(() =>
    Array.from(document.body.children)
      .filter((el) => !el.matches('[role="dialog"], script'))
      .every((el) => (el as HTMLElement).inert),
  )
  expect(inert).toBe(true)

  const inside = () => page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab')
    expect(await inside()).toBe(true)
  }
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Shift+Tab')
    expect(await inside()).toBe(true)
  }

  await page.keyboard.press('Escape')
  await expect(sheet).toHaveCount(0)
  await expect(dateButton(page)).toBeFocused()
})

test('Tab stays inside a sheet that holds a listbox, and stops once at the chosen option', async ({ page }) => {
  await openLog(page)
  await page.getByRole('button', { name: /^Training plan: / }).click()
  const picker = page.getByRole('dialog', { name: 'Pick a plan' })
  await expect(picker).toBeVisible()
  const focus = () =>
    page.evaluate(() => ({
      inside: Boolean(document.activeElement?.closest('[role="dialog"]')),
      option: document.activeElement?.getAttribute('role') === 'option' ? document.activeElement.getAttribute('aria-selected') : null,
    }))
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press(key)
      const now = await focus()
      expect(now.inside, `${key} ${i}`).toBe(true)
      if (now.option !== null) expect(now.option).toBe('true')
    }
  }
})
