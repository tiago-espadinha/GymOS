import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { logSet } from './log-set'
import { restStarted } from './rest-started'

const plan = {
  id: 'p1',
  name: 'Back',
  desc: '',
  exercises: [
    { id: 'e1', name: 'Machine row', muscleGroup: 'Back' },
    { id: 'e2', name: 'Plank', muscleGroup: 'Core', category: 'calisthenics', trackingType: 'time' },
  ],
}

const open = async (page: Page, exercise: RegExp) => {
  // Paused, so the timers only move when a test fast-forwards the clock.
  await page.clock.install({ time: new Date('2026-01-05T10:00:00') })
  await page.clock.pauseAt(new Date('2026-01-05T10:00:05'))
  await page.addInitScript((p) => {
    if (!localStorage.getItem('gym:plans')) localStorage.setItem('gym:plans', JSON.stringify([p]))
  }, plan)
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Back' }).click()
  await page.getByRole('button', { name: exercise }).click()
}

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const timerBlock = (page: Page) => page.locator('.exerciseScreen:not([hidden]) .timerBlock').filter({ visible: true })
const nextCard = (page: Page) => page.locator('.exerciseScreen:not([hidden]) .exerciseNextCard')
const box = async (locator: Locator) => (await locator.boundingBox())!
// axe needs the page's timers, so the clock runs from here on.
const axe = async (page: Page) => {
  await page.clock.resume()
  return (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations.map(
    (v) => `${v.id} ${v.nodes.map((n) => n.html).join()}`,
  )
}

// The timer is the left 60% of the window at full height; its buttons are 64 tall.
const expectSplit = async (page: Page, label: RegExp) => {
  await expect(timerBlock(page)).toHaveCount(1)
  await expect(timerBlock(page).locator('.timerBlockTop').first()).toContainText(label)
  expect(await box(timerBlock(page))).toEqual({ x: 0, y: 0, width: 768, height: 800 })
  for (const b of await timerBlock(page).locator('.timerBlockButton').all()) expect((await box(b)).height).toBe(64)
}

// With no Set done during a rest, the steppers sit straight above the next card,
// and the card ends level with End rest, not mid-column.
const expectStepperLevelWithEndRest = async (page: Page) => {
  const steppers = await box(page.locator('.exerciseScreen:not([hidden]) .exerciseLoggerStack > .setSteppers'))
  const card = await box(nextCard(page))
  const end = await box(button(page, 'End rest'))
  expect(card.y + card.height).toBeCloseTo(end.y + end.height, 0)
  expect(card.y - (steppers.y + steppers.height)).toBeCloseTo(12, 0)
}

test.describe('wide session, 1280', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false })

  test('a reps exercise splits: idle rest on the left, entry on the right, Set done at the bottom', async ({ page }) => {
    await open(page, /^Machine row/)
    await expectSplit(page, /Rest\s*After set 1/)
    // Idle is not a running timer, so nothing is announced as one.
    await expect(page.getByRole('timer')).toHaveCount(0)
    await expect(timerBlock(page)).toContainText('Starts on Set done')
    await expect(timerBlock(page).locator('.timerBlockButton')).toHaveCount(0)
    const size = await timerBlock(page).locator('.timerBlockCountdown').first().evaluate((el) => getComputedStyle(el).fontSize)
    // 400 at most; at 1280 it shrinks so "00:42" fits the 768 timer.
    expect(parseFloat(size)).toBeCloseTo((768 - 96) / 2.3, 0)

    const title = await box(page.getByRole('heading', { name: 'Machine row' }))
    expect(title.x).toBe(808)
    // The page fits the window, so Set done and the next card sit at the bottom without being stuck there.
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(800)
    const done = await box(button(page, 'Set done'))
    const card = await box(page.getByRole('button', { name: /^Next Plank/ }))
    expect(card.y + card.height).toBe(760)
    expect(card.y - (done.y + done.height)).toBe(12)
    expect(done.x + done.width).toBe(1240)
    await expect(button(page, 'All exercises')).toBeVisible()
    // Finish is on the last exercise only.
    await expect(page.getByRole('button', { name: /Finish session/ })).toHaveCount(0)
    expect(await axe(page)).toEqual([])
  })

  test('rest and overtime fill the split; Finish on the last exercise opens the Done screen', async ({ page }) => {
    await open(page, /^Machine row/)
    await logSet(page, '35', '12')
    await restStarted(page)
    await expectSplit(page, /^Rest\s*Set 1/)
    await expect(button(page, 'End rest')).toBeVisible()
    await expectStepperLevelWithEndRest(page)
    await page.clock.fastForward(75_000)
    await expectSplit(page, /Rest over/)
    await expect(page.getByRole('timer', { name: /^Rest over/ })).toContainText('+0:15')
    expect(await axe(page)).toEqual([])

    await page.getByRole('button', { name: /^Next Plank/ }).click()
    const finish = page.getByRole('button', { name: 'Finish session', exact: true })
    const card = await box(finish)
    expect(card.y + card.height).toBe(760)
    await finish.click()
    await expect(page.getByRole('button', { name: 'Save session' })).toBeVisible()
    await expect(page.locator('.timerBlock').filter({ visible: true })).toHaveCount(0)
    const main = await box(page.locator('.mainContent'))
    expect(main).toMatchObject({ x: 340, width: 600 })

    // Back returns to the exercise and its Finish; the other exercise keeps its stepper values.
    await page.getByRole('button', { name: 'Session', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Plank' })).toBeVisible()
    await expect(finish).toBeFocused()
    await page.getByRole('button', { name: /^Machine row, exercise 1 of 2/ }).click()
    await expect(page.getByRole('textbox', { name: 'Weight', exact: true })).toHaveValue('35')
  })

  test('a hold splits when ready, running, paused, past target and in its chained rest', async ({ page }) => {
    await open(page, /^Plank/)
    await expectSplit(page, /Hold · ready/)
    await button(page, 'Start hold').click()
    await page.clock.fastForward(5_000)
    await expectSplit(page, /^Hold\s*Set 1 of 1/)
    await button(page, 'Pause').click()
    await expectSplit(page, /Hold · paused/)
    await button(page, 'Resume').click()
    await page.clock.fastForward(10_000)
    // The rest is chained by default, so reaching the target starts it.
    await restStarted(page)
    await expectSplit(page, /^Rest/)
    await expect(button(page, 'Start hold now')).toBeVisible()

    await button(page, 'End rest').click()
    await page.getByRole('switch', { name: /^Then rest/ }).click()
    await button(page, 'Start hold').click()
    await page.clock.fastForward(20_000)
    await expectSplit(page, /Hold · past target/)
    await expect(page.getByRole('timer', { name: /^Hold/ })).toContainText('+0:05')
    const stop = await box(page.getByRole('button', { name: /^Stop and log/ }))
    expect(stop.x).toBe(808)
    expect(await axe(page)).toEqual([])
  })

  test('editing a logged hold keeps the hold in the timer half', async ({ page }) => {
    await open(page, /^Plank/)
    await button(page, 'Start hold').click()
    await page.clock.fastForward(15_000)
    await restStarted(page)
    await button(page, 'End rest').click()
    await page.getByRole('button', { name: 'Edit set 1' }).click()
    await expectSplit(page, /Hold · ready/)
    await expect(button(page, 'Cancel')).toBeVisible()
  })

  test('a hold that ends during an edit leaves the edit panel in place', async ({ page }) => {
    await open(page, /^Plank/)
    await button(page, 'Start hold').click()
    await page.clock.fastForward(15_000)
    await restStarted(page)
    await button(page, 'End rest').click()
    await button(page, 'Start hold').click()
    await page.getByRole('button', { name: 'Edit set 1' }).click()
    await page.clock.fastForward(20_000)
    await restStarted(page)
    const steppers = page.locator('.exerciseScreen:not([hidden]) .exerciseLoggerStack > .setSteppers')
    await expect(steppers).not.toHaveCSS('position', 'sticky')
    const save = await box(button(page, 'Save set 1'))
    const s = await box(steppers)
    expect(save.y).toBeGreaterThan(s.y + s.height)
  })

  test('the session list keeps the 600 column', async ({ page }) => {
    await open(page, /^Machine row/)
    await button(page, 'All exercises').click()
    await expect(page.getByRole('button', { name: /^Plank/ })).toBeVisible()
    expect(await box(page.locator('.mainContent'))).toMatchObject({ x: 340, width: 600 })
    await expect(page.locator('.timerBlock').filter({ visible: true })).toHaveCount(0)
  })
})

test.describe('wide session, other sizes', () => {
  test.use({ isMobile: false, hasTouch: false })

  test('1024×768: nothing scrolls sideways and Set done stays on screen', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await open(page, /^Machine row/)
    const block = await box(timerBlock(page))
    expect(block.x).toBe(0)
    expect(block.width).toBeCloseTo(1024 * 0.6, 0)
    expect(block.height).toBe(768)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1024)
    const done = await box(button(page, 'Set done'))
    expect(done.y + done.height).toBeLessThanOrEqual(768)
  })

  test('1024×768: during a rest the steppers end level with End rest', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await open(page, /^Machine row/)
    await logSet(page, '35', '12')
    await restStarted(page)
    await expectStepperLevelWithEndRest(page)
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(768)
    expect(await axe(page)).toEqual([])
  })

  test('1920×1080: the countdown reaches 400', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await open(page, /^Machine row/)
    await expect(timerBlock(page).locator('.timerBlockCountdown').first()).toHaveCSS('font-size', '400px')
  })
})
