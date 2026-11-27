import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { finishButton, logSet, sessionActions } from './log-set'

// Each button role, measured by computed style where the app draws it.
const exercise = { id: 'e1', name: 'Bench Press', muscleGroup: 'Chest' }
const plans = [
  { id: 'p1', name: 'Push', desc: '', exercises: [exercise] },
  { id: 'p3', name: 'Core', desc: '', exercises: [{ id: 'e2', name: 'Plank', muscleGroup: 'Core', category: 'calisthenics', trackingType: 'time' }] },
  { id: 'p2', name: 'Old hypertrophyaccumulation block', desc: '', exercises: [exercise], isArchived: true, archivedAt: '2026-11-01' },
]

const WHITE = 'rgb(255, 255, 255)'
const DANGER = 'rgb(255, 138, 122)'
const GREY = 'rgb(58, 58, 58)'
const CLEAR = 'rgba(0, 0, 0, 0)'

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.addInitScript((p) => {
    if (!localStorage.getItem('gym:plans')) localStorage.setItem('gym:plans', JSON.stringify(p))
  }, plans)
  await page.goto('/')
})

const axe = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(violations).toEqual([])
}

const style = (el: Locator) =>
  el.evaluate((node) => {
    const s = getComputedStyle(node)
    return {
      height: node.getBoundingClientRect().height,
      radius: s.borderTopLeftRadius,
      border: `${s.borderTopWidth} ${s.borderTopColor}`,
      fill: s.backgroundColor,
      colour: s.color,
      face: s.fontFamily.split(',')[0].replaceAll('"', ''),
      size: s.fontSize,
      weight: s.fontWeight,
      letters: s.textTransform,
    }
  })

const display = { radius: '999px', face: 'Big Shoulders Display', weight: '900', letters: 'uppercase' }
const secondary = { ...display, height: 64, size: '28px', border: `2px ${WHITE}`, fill: CLEAR, colour: WHITE }
const compact = { ...display, height: 44, size: '24px' }

test('compact: Start and the archived row are 44 pills at 24, Delete in the danger colour', async ({ page }) => {
  expect(await style(page.getByRole('button', { name: 'Start Push' }))).toMatchObject(compact)
  await page.getByRole('button', { name: /^Archived/ }).click()
  expect(await style(page.getByRole('button', { name: 'Restore Old hypertrophyaccumulation block' }))).toMatchObject({ ...compact, border: `2px ${WHITE}`, fill: CLEAR })
  expect(await style(page.getByRole('button', { name: 'Delete Old hypertrophyaccumulation block' }))).toMatchObject({
    ...compact,
    border: `2px ${DANGER}`,
    colour: DANGER,
    fill: CLEAR,
  })
  // The wider buttons leave the name less room: it wraps rather than being cut off.
  const clipped = await page
    .locator('.planRow--archived .planRow__name, .planRow--archived .planRow__meta')
    .evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth).length)
  expect(clipped).toBe(0)
})

test('confirm: a 44 title over a white Keep it and a secondary danger', async ({ page }) => {
  await page.getByRole('button', { name: /^Archived/ }).click()
  await page.getByRole('button', { name: 'Delete Old hypertrophyaccumulation block' }).click()
  const confirm = page.getByRole('alertdialog')
  await expect(confirm.getByRole('heading')).toHaveCSS('font-size', '44px')
  await expect(confirm.getByRole('button')).toHaveText(['Keep it', 'Delete plan'])
  expect(await style(confirm.getByRole('button', { name: 'Keep it' }))).toMatchObject({ ...display, height: 72, fill: WHITE })
  expect(await style(confirm.getByRole('button', { name: 'Delete plan' }))).toMatchObject({
    ...secondary,
    border: `2px ${DANGER}`,
    colour: DANGER,
  })
  await axe(page)
})

test('icon: a grey circle, 44 on a plan row and the session, 72 beside the overview Start', async ({ page }) => {
  const circle = { radius: '999px', border: `2px ${GREY}`, fill: CLEAR }
  const row = page.getByRole('button', { name: 'More actions for Push' })
  expect(await style(row)).toMatchObject({ ...circle, height: 44 })
  expect((await row.boundingBox())!.width).toBe(44)

  await page.getByRole('button', { name: /^Push/ }).click()
  const beside = page.getByRole('button', { name: 'More actions for Push' })
  expect(await style(beside)).toMatchObject({ ...circle, height: 72 })
  expect((await beside.boundingBox())!.width).toBe(72)

  await page.getByRole('button', { name: 'Start Push' }).click()
  expect(await style(sessionActions(page))).toMatchObject({ ...circle, height: 44 })
  // Finish is disabled until a set is logged: the real attribute, dimmed.
  await expect(finishButton(page)).toBeDisabled()
  await expect(finishButton(page)).toHaveCSS('opacity', '0.4')
})

test('sheet frame: header and rows edge to edge, hairlines, and a secondary Close last', async ({ page }) => {
  await page.getByRole('button', { name: 'Start Push' }).click()
  await sessionActions(page).click()
  const sheet = page.getByRole('dialog', { name: 'Push' })
  const outer = (await sheet.boundingBox())!
  for (const part of [sheet.locator('.sheet__head'), sheet.getByRole('button', { name: /^Discard session/ })]) {
    const box = (await part.boundingBox())!
    expect(box.x).toBe(outer.x)
    expect(box.width).toBe(outer.width)
  }
  expect((await sheet.locator('.sheet__head').boundingBox())!.y).toBe(outer.y)
  await expect(sheet.getByRole('heading')).toHaveCSS('font-size', '44px')
  await expect(sheet.getByRole('button', { name: /^Discard session/ })).toHaveCSS('border-bottom-width', '1px')
  await expect(sheet.getByRole('button').last()).toHaveText('Close')
  expect(await style(sheet.getByRole('button', { name: 'Close' }))).toMatchObject(secondary)
})

test('secondary: End rest below the timer and Add set on a saved session', async ({ page }) => {
  await page.getByRole('button', { name: 'Start Push' }).click()
  await page.getByRole('button', { name: /^Bench Press/ }).click()
  await logSet(page, '60', '8')
  expect(await style(page.getByRole('button', { name: 'End rest' }))).toMatchObject(secondary)

  await page.getByRole('button', { name: 'All exercises' }).click()
  await finishButton(page).click()
  await page.getByRole('button', { name: 'Save session' }).click()
  await page.getByRole('button', { name: /^Edit Push/ }).click()
  await page.getByRole('button', { name: /^Bench Press/ }).click()
  expect(await style(page.getByRole('button', { name: 'Add set' }))).toMatchObject(secondary)
  await axe(page)
})

test('secondary: Pause, then Stop and Resume, below a hold', async ({ page }) => {
  await page.getByRole('button', { name: 'Start Core' }).click()
  await page.getByRole('button', { name: /^Plank/ }).click()
  await page.getByRole('button', { name: 'Start hold' }).click()
  const pause = page.getByRole('button', { name: 'Pause', exact: true })
  expect(await style(pause)).toMatchObject(secondary)
  await pause.click()
  for (const name of ['Stop', 'Resume']) {
    expect(await style(page.getByRole('button', { name, exact: true }))).toMatchObject(secondary)
  }
})

test('plan sheet: display rows with the hint under, no outline, and a secondary Close', async ({ page }) => {
  await page.getByRole('button', { name: 'More actions for Push' }).click()
  const sheet = page.getByRole('dialog', { name: 'Push' })
  const outer = (await sheet.boundingBox())!
  for (const [name, title] of [[/^Edit plan/, 'Edit plan'], [/^Archive plan/, 'Archive plan']] as const) {
    const row = sheet.getByRole('button', { name })
    const box = (await row.boundingBox())!
    expect(box.x).toBe(outer.x)
    expect(box.width).toBe(outer.width)
    expect(await style(row)).toMatchObject({ face: display.face, letters: 'uppercase', size: '28px', colour: WHITE, fill: CLEAR })
    await expect(row).toHaveCSS('border-top-width', '0px')
    await expect(row).toHaveCSS('border-bottom-width', '1px')
    const label = (await row.getByText(title, { exact: true }).boundingBox())!
    const hint = (await row.locator('.sheet__hint').boundingBox())!
    expect(hint.y).toBeGreaterThanOrEqual(label.y + label.height)
    expect(hint.x + hint.width).toBeLessThanOrEqual(box.x + box.width)
  }
  await expect(sheet.getByRole('button').last()).toHaveText('Close')
  expect(await style(sheet.getByRole('button', { name: 'Close' }))).toMatchObject(secondary)
  await axe(page)
})

test('secondary: Add exercise on the plan form', async ({ page }) => {
  await page.getByRole('button', { name: 'Create New' }).click()
  expect(await style(page.getByRole('button', { name: 'Add exercise' }))).toMatchObject(secondary)
  await axe(page)
})

test('text: the plan overview and the session draw back the same way', async ({ page }) => {
  const back = (el: Locator) =>
    el.evaluate((node) => {
      const s = getComputedStyle(node)
      const box = node.getBoundingClientRect()
      return [box.x, box.height, s.fontFamily, s.fontSize, s.fontWeight, s.textTransform, s.letterSpacing, s.color, s.gap]
    })
  await page.getByRole('button', { name: /^Push/ }).click()
  const plans = await back(page.getByRole('button', { name: 'Back to Plans' }))
  await page.getByRole('button', { name: 'Start Push' }).click()
  await page.getByRole('button', { name: /^Bench Press/ }).click()
  expect(plans).toEqual(await back(page.getByRole('button', { name: 'All exercises' })))
})

for (const width of [320, 360, 375]) {
  test(`archived row at ${width}px: no word is split and no line starts on the dot`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 })
    await page.getByRole('button', { name: /^Archived/ }).click()
    const row = page.locator('.planRow--archived')
    const broken = await row.locator('.planRow__name, .planRow__meta').evaluateAll((els) =>
      els.flatMap((el) => {
        const text = el.firstChild!
        const lines = (from: number, to: number) => {
          const range = document.createRange()
          range.setStart(text, from)
          range.setEnd(text, to)
          return range.getClientRects()
        }
        // A word, or the dot with the word it is glued to, sits on one line.
        return Array.from(el.textContent!.matchAll(/[^ ]+/g))
          .filter((m) => new Set(Array.from(lines(m.index, m.index + m[0].length), (r) => Math.round(r.top))).size > 1)
          .map((m) => m[0])
      }),
    )
    // At 320 the long word alone is wider than the row, so only it may split.
    expect(broken).toEqual(width === 320 ? ['hypertrophyaccumulation'] : [])
    const outer = (await row.boundingBox())!
    for (const name of [/^Restore/, /^Delete/]) {
      const box = (await row.getByRole('button', { name }).boundingBox())!
      expect(box.height).toBe(44)
      expect(box.x + box.width).toBeLessThanOrEqual(outer.x + outer.width)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  })
}

test('secondary: the date sheet ends in Close under a 44 title', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Log' }).click()
  await page.getByRole('button', { name: /^Session date: / }).click()
  const sheet = page.getByRole('dialog', { name: 'Session date' })
  expect(await style(sheet.getByRole('button', { name: 'Close' }))).toMatchObject(secondary)
  await expect(sheet.getByRole('heading', { name: 'Session date' })).toHaveCSS('font-size', '44px')
  await axe(page)
})

for (const width of [375, 1280]) {
  test(`secondary: Show more at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 })
    const sessions = Array.from({ length: 8 }, (_, i) => ({
      id: `s${i}`,
      planId: 'p1',
      planName: 'Push',
      date: `2026-11-${String(i + 1).padStart(2, '0')}`,
      exercises: [{ ...exercise, sets: [{ weight: 60, reps: 8 }] }],
    }))
    await page.evaluate((s) => localStorage.setItem('gym:sessions', JSON.stringify(s)), sessions)
    await page.reload()
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Log' }).click()
    const more = page.getByRole('button', { name: 'Show more' })
    expect(await style(more)).toMatchObject(secondary)
    // Full width on a phone, sized to its label under the wide table.
    const share = (await more.boundingBox())!.width / (await page.locator('.logHomeList').boundingBox())!.width
    if (width < 1024) expect(share).toBeGreaterThan(0.9)
    else expect(share).toBeLessThan(0.5)
    // Tabbed to, so the keyboard focus ring shows.
    await more.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(more).toBeFocused()
    await expect(more).toHaveCSS('outline-style', 'solid')
    await axe(page)
  })
}
