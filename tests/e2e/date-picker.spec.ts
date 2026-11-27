import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const plans = [{ id: 'p1', name: 'Push day', desc: '', exercises: [{ id: 'e1', name: 'Bench press', muscleGroup: 'Chest' }] }]

// Wednesday 25 November 2026, so the calendar is the same on every run.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-25T10:00:00Z'))
  await page.addInitScript((p) => {
    if (!localStorage.getItem('gym:plans')) localStorage.setItem('gym:plans', JSON.stringify(p))
  }, plans)
})

const dateButton = (page: Page) => page.getByRole('button', { name: /^Session date: / })
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Session date' })
const field = (page: Page) => sheet(page).getByLabel('Another day')
const grid = (page: Page) => sheet(page).getByRole('grid')
const day = (page: Page, name: string) => grid(page).getByRole('button', { name, exact: true })

const openSheet = async (page: Page) => {
  await page.goto('/')
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Log' }).click()
  await dateButton(page).click()
  await expect(sheet(page)).toBeVisible()
}

const axe = async (page: Page) => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
}

test('no native date input: a DD/MM/YYYY field with a visible placeholder and a month grid', async ({ page }) => {
  await openSheet(page)
  await expect(page.locator('input[type="date"]')).toHaveCount(0)
  await expect(field(page)).toHaveAttribute('placeholder', 'DD/MM/YYYY')
  await expect(field(page)).toHaveValue('')
  // The placeholder is drawn in the muted text colour, not left to the engine's default.
  const colours = await field(page).evaluate((el) => {
    const probe = document.createElement('span')
    probe.style.color = 'var(--color-text-muted)'
    document.body.append(probe)
    const muted = getComputedStyle(probe).color
    probe.remove()
    return { placeholder: getComputedStyle(el, '::placeholder').color, muted }
  })
  expect(colours.placeholder).toBe(colours.muted)

  await expect(grid(page)).toHaveAccessibleName('November 2026')
  await expect(grid(page).getByRole('columnheader')).toHaveText(['M', 'T', 'W', 'T', 'F', 'S', 'S'])
  // 1 Nov 2026 is a Sunday: the last column of the first week.
  await expect(grid(page).getByRole('row').nth(1).getByRole('gridcell').nth(6)).toHaveText('1')
  await expect(day(page, 'Wednesday 25 November 2026')).toHaveAttribute('aria-current', 'date')
  await expect(sheet(page).getByRole('gridcell', { selected: true })).toHaveText('25')
  await axe(page)
})

test('typing builds DD/MM/YYYY and applies a complete past date', async ({ page }) => {
  await openSheet(page)
  await field(page).pressSequentially('0111')
  await expect(field(page)).toHaveValue('01/11/')
  // Backspace takes the slash, then the digit before it.
  await page.keyboard.press('Backspace')
  await expect(field(page)).toHaveValue('01/11')
  await page.keyboard.press('Backspace')
  await expect(field(page)).toHaveValue('01/1')
  await field(page).pressSequentially('12025')
  await expect(field(page)).toHaveValue('01/11/2025')
  // The calendar follows the typed date; the sheet stays open until Close.
  await expect(grid(page)).toHaveAccessibleName('November 2025')
  await expect(sheet(page).getByRole('gridcell', { selected: true })).toHaveText('1')
  await sheet(page).getByRole('button', { name: 'Close' }).click()
  await expect(dateButton(page)).toContainText('Sat 1 Nov')
})

test('a future, impossible or pre-2000 date is refused with a message', async ({ page }) => {
  await openSheet(page)
  const error = sheet(page).locator('.dateSheet__error')
  for (const [typed, message] of [
    ['26/11/2026', "That's in the future. Pick today or earlier."],
    ['31/02/2026', "That date doesn't exist."],
    ['31/12/1999', 'Pick a date from 2000 on.'],
  ]) {
    await field(page).fill(typed)
    await expect(field(page)).toHaveAttribute('aria-invalid', 'true')
    await expect(error).toHaveText(message)
    await expect(field(page)).toHaveAccessibleDescription(message)
  }
  await axe(page)
  await sheet(page).getByRole('button', { name: 'Close' }).click()
  await expect(dateButton(page)).toContainText('Wed 25 Nov')
})

test('a calendar day picks and closes; future days and months cannot be picked', async ({ page }) => {
  await openSheet(page)
  await expect(sheet(page).getByRole('button', { name: 'Next month' })).toHaveAttribute('aria-disabled', 'true')
  const future = day(page, 'Thursday 26 November 2026')
  await expect(future).toHaveAttribute('aria-disabled', 'true')
  await future.click({ force: true })
  await expect(sheet(page)).toBeVisible()

  await sheet(page).getByRole('button', { name: 'Previous month' }).click()
  await expect(grid(page)).toHaveAccessibleName('October 2026')
  await expect(sheet(page).getByRole('button', { name: 'Next month' })).not.toHaveAttribute('aria-disabled')
  await day(page, 'Friday 9 October 2026').click()
  await expect(sheet(page)).toHaveCount(0)
  await expect(dateButton(page)).toContainText('Fri 9 Oct')
  await expect(dateButton(page)).toBeFocused()
})

test('the grid is one tab stop moved by arrows and Page keys, never past today', async ({ page }) => {
  await openSheet(page)
  await sheet(page).getByRole('button', { name: 'Previous month' }).click()
  await day(page, 'Friday 9 October 2026').click()
  await dateButton(page).click()
  // Another day chosen: focus lands on it in the grid.
  await expect(day(page, 'Friday 9 October 2026')).toBeFocused()
  await expect(grid(page).locator('button[tabindex="0"]')).toHaveCount(1)

  await page.keyboard.press('ArrowRight')
  await expect(day(page, 'Saturday 10 October 2026')).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(day(page, 'Saturday 3 October 2026')).toBeFocused()
  await page.keyboard.press('Home')
  await expect(day(page, 'Monday 28 September 2026')).toBeFocused()
  await expect(grid(page)).toHaveAccessibleName('September 2026')
  await page.keyboard.press('PageDown')
  await page.keyboard.press('PageDown')
  await expect(day(page, 'Wednesday 25 November 2026')).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(day(page, 'Wednesday 25 November 2026')).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('Enter')
  await expect(sheet(page)).toHaveCount(0)
  await expect(dateButton(page)).toContainText('Tue 24 Nov')
})

test('Enter in the field closes once a typed date is in use', async ({ page }) => {
  await openSheet(page)
  await field(page).fill('01/11/2026')
  await field(page).press('Enter')
  await expect(sheet(page)).toHaveCount(0)
  await expect(dateButton(page)).toContainText('Sun 1 Nov')
  await expect(dateButton(page)).toBeFocused()
})

test('keys that cannot move keep focus where it is and never pull it back from the field', async ({ page }) => {
  await openSheet(page)
  const today = day(page, 'Wednesday 25 November 2026')
  await today.focus()
  for (const key of ['ArrowRight', 'PageDown', 'End']) {
    await page.keyboard.press(key)
    await expect(today).toBeFocused()
  }
  // A key that moved nothing must not pull focus back into the grid later.
  await field(page).focus()
  await field(page).pressSequentially('01112025')
  await expect(field(page)).toBeFocused()
})

test('returning to this month keeps focus on Next month, and Escape still closes', async ({ page }) => {
  await openSheet(page)
  const prev = sheet(page).getByRole('button', { name: 'Previous month' })
  const next = sheet(page).getByRole('button', { name: 'Next month' })
  await prev.focus()
  await page.keyboard.press('Enter')
  await next.focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await expect(next).toBeFocused()
  await expect(next).toHaveAttribute('aria-disabled', 'true')
  await page.keyboard.press('Escape')
  await expect(sheet(page)).toHaveCount(0)
})

// November 2026 takes six week rows, and the error line makes the sheet its tallest.
test('at 375x812 the sheet needs no scrolling, the error showing too', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await openSheet(page)
  const today = (await sheet(page).getByRole('button', { name: /^Today/ }).boundingBox())!
  const yesterday = (await sheet(page).getByRole('button', { name: /^Yesterday/ }).boundingBox())!
  expect(yesterday.y).toBe(today.y)
  const fits = async () => {
    expect(await sheet(page).evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(0)
    await expect(sheet(page).getByRole('button', { name: 'Close' })).toBeInViewport({ ratio: 1 })
  }
  await fits()
  await field(page).fill('31/02/2026')
  await expect(sheet(page).locator('.dateSheet__error')).toBeVisible()
  await fits()
})

test('the open picker fits the phone sheet: seven 44px day columns, nothing cut off', async ({ page }, testInfo) => {
  await openSheet(page)
  const layout = await sheet(page).evaluate((el) => {
    const days = Array.from(el.querySelectorAll<HTMLElement>('.calendar__day')).map((d) => d.getBoundingClientRect())
    const columns = new Set(days.map((d) => Math.round(d.left)))
    return {
      columns: columns.size,
      square: days.every((d) => Math.round(d.width) === 44 && Math.round(d.height) === 44),
      noSideScroll: el.scrollWidth <= el.clientWidth,
    }
  })
  expect(layout).toEqual({ columns: 7, square: true, noSideScroll: true })
  // A 320 px phone: the days shrink with their columns instead of overlapping.
  await page.setViewportSize({ width: 320, height: 640 })
  const narrow = await sheet(page).evaluate((el) => {
    const days = Array.from(el.querySelectorAll<HTMLElement>('.calendar__day')).map((d) => d.getBoundingClientRect())
    const row = days.slice(1, 8)
    return row.every((d, i) => i === 0 || d.left >= row[i - 1].right) && el.scrollWidth <= el.clientWidth
  })
  expect(narrow).toBe(true)
  await page.screenshot({ path: testInfo.outputPath(`date-sheet-${testInfo.project.name}.png`) })
})

for (const width of [0, 1280]) {
  test(`the grid keeps six week rows of space, so nothing in the sheet moves between months${width ? ` at ${width}px` : ''}`, async ({ page }) => {
    if (width) await page.setViewportSize({ width, height: 800 })
    await openSheet(page)
    // The sheet sits on the bottom edge, so a shorter grid would move its top and every button above the grid.
    const layout = () =>
      sheet(page).evaluate((el) => ({
        top: Math.round(el.getBoundingClientRect().top),
        buttons: Array.from(el.querySelectorAll('button:not(.calendar__day)'), (b) => {
          const r = b.getBoundingClientRect()
          return `${b.textContent?.trim() || b.getAttribute('aria-label')} ${Math.round(r.left)},${Math.round(r.top)}`
        }),
      }))
    // Weeks plus the weekday header: padding rows are hidden from screen readers.
    const weeks = (n: number) => expect(grid(page).getByRole('row')).toHaveCount(n + 1)

    await expect(grid(page)).toHaveAccessibleName('November 2026')
    await weeks(6)
    const sixRows = await layout()

    await sheet(page).getByRole('button', { name: 'Previous month' }).click()
    await expect(grid(page)).toHaveAccessibleName('October 2026')
    await weeks(5)
    expect(await layout()).toEqual(sixRows)

    // 1 Feb 2021 is a Monday in a 28-day month: four rows.
    await field(page).fill('01/02/2021')
    await expect(grid(page)).toHaveAccessibleName('February 2021')
    await weeks(4)
    const fourRows = await layout()
    expect(fourRows.top).toBe(sixRows.top)
    // The chosen quick option changes, so compare positions, not labels.
    expect(fourRows.buttons.map((b) => b.split(' ').pop())).toEqual(sixRows.buttons.map((b) => b.split(' ').pop()))
    await axe(page)
  })
}
