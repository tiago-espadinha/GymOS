import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { logSet } from './log-set'
import { restStarted } from './rest-started'

const plan = {
  id: 'p1',
  name: 'Push day',
  desc: '',
  exercises: [{ id: 'e1', name: 'Bench press', muscleGroup: 'Chest' }],
}

test.beforeEach(async ({ page }) => {
  // Paused, so the countdown only moves when a test fast-forwards it.
  await page.clock.install({ time: new Date('2026-01-05T10:00:00') })
  await page.clock.pauseAt(new Date('2026-01-05T10:00:05'))
  await page.addInitScript((p) => {
    if (!localStorage.getItem('gym:plans')) localStorage.setItem('gym:plans', JSON.stringify([p]))
  }, plan)
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Push day' }).click()
  await page.getByRole('button', { name: /^Bench press/ }).click()
})

const setDone = (page: Page) => page.getByRole('button', { name: 'Set done' })
const timer = (page: Page) => page.getByRole('timer', { name: /^Rest/ })

const logAndRest = async (page: Page) => {
  await logSet(page, '60', '8')
  await restStarted(page)
}

// Height of the lime fill as a share of the block.
const fillShare = (page: Page) =>
  page.evaluate(() => {
    const block = document.querySelector('.timerBlock')!.getBoundingClientRect()
    const fill = document.querySelector('.timerBlockFill')!.getBoundingClientRect()
    return fill.height / block.height
  })

test('Set done is disabled until the set has values, then logs it and starts a rest', async ({ page }) => {
  await expect(setDone(page)).toBeDisabled()
  await expect(timer(page)).toHaveCount(0)
  await logAndRest(page)
  await expect(timer(page)).toBeVisible()
  await expect(timer(page)).toContainText('01:00')
  // No empty set is appended; the next one is virtual until it is logged.
  await page.getByRole('button', { name: 'End rest' }).click()
  await expect(page.getByRole('list', { name: 'Sets' }).getByRole('listitem')).toHaveCount(2)
  await page.getByRole('button', { name: 'All exercises' }).click()
  await expect(page.getByRole('img', { name: '1 of 1 sets done' })).toBeVisible()
})

test('while resting only End rest moves on: Set done is gone, the steppers stay for the next set', async ({ page }) => {
  await logAndRest(page)
  await expect(setDone(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'End rest' })).toBeFocused()
  const weight = page.getByRole('textbox', { name: 'Weight', exact: true })
  await weight.fill('62.5')
  await page.getByRole('button', { name: 'End rest' }).click()
  await expect(timer(page)).toHaveCount(0)
  await expect(setDone(page)).toBeFocused()
  await expect(weight).toHaveValue('62.5')
})

test('the block fills in step with the elapsed rest', async ({ page }) => {
  await logAndRest(page)
  await page.clock.fastForward(15_000)
  await expect.poll(() => fillShare(page)).toBeCloseTo(0.25, 1)
  await page.clock.fastForward(15_000)
  await expect.poll(() => fillShare(page)).toBeCloseTo(0.5, 1)
  await expect(timer(page)).toContainText('00:30')
})

test('−15s and +15s move the target; End rest ends the rest', async ({ page }) => {
  await logAndRest(page)
  await page.getByRole('button', { name: '+15s' }).click()
  await expect(page.getByText('Target 01:15').first()).toBeVisible()
  await page.getByRole('button', { name: '−15s' }).click()
  await page.getByRole('button', { name: '−15s' }).click()
  await expect(page.getByText('Target 00:45').first()).toBeVisible()
  await page.getByRole('button', { name: 'End rest' }).click()
  await expect(timer(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Rest/ })).toHaveCount(0)
})

test('a finished rest reads REST OVER, fills the block and counts up as +m:ss, here and on the strip', async ({ page }) => {
  await logAndRest(page)
  await page.clock.fastForward(60_000)
  await expect(timer(page)).toContainText('+0:00')
  await page.clock.fastForward(15_000)
  await expect(timer(page)).toContainText('+0:15')
  await expect(page.getByRole('timer', { name: /^Rest over/ })).toBeVisible()
  await expect(page.getByText('01:00 done').first()).toBeVisible()
  await expect.poll(() => fillShare(page)).toBeCloseTo(1, 1)
  await expect(page.getByRole('button', { name: '−15s' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '+15s' })).toBeVisible()
  await page.getByRole('button', { name: 'All exercises' }).click()
  await page.clock.fastForward(1_000)
  const strip = page.getByRole('button', { name: /^Rest over/ })
  await expect(strip).toContainText('+0:16')
})

test('past the target the button still reads End rest and ends the rest', async ({ page }) => {
  await logAndRest(page)
  await page.clock.fastForward(65_000)
  await expect(page.getByRole('timer', { name: /^Rest over/ })).toContainText('+0:05')
  await page.getByRole('button', { name: 'End rest' }).click()
  await expect(timer(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'All exercises' }).click()
  // The strip polls the stored timers; let one poll run on the paused clock.
  await page.clock.fastForward(1_000)
  await expect(page.getByRole('button', { name: /^Rest/ })).toHaveCount(0)
})

test('the exercise view with a rest running has no detectable WCAG A/AA violations', async ({ page }) => {
  await logAndRest(page)
  await page.clock.fastForward(30_000)
  await page.clock.resume() // axe needs the page's timers
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.html + n.any.map((a) => a.message).join())}`)).toEqual([])
})

test('stepping down to zero reads as a finished rest, not an empty one', async ({ page }) => {
  await logAndRest(page)
  // From 1:00 the step is 15s; under a minute it is 5s.
  await page.getByRole('button', { name: '−15s' }).click()
  await expect(page.getByRole('button', { name: '−15s' })).toHaveCount(0)
  for (let i = 0; i < 9; i++) await page.getByRole('button', { name: '−5s' }).click()
  await expect(page.getByText('00:00 done').first()).toBeVisible()
  await expect.poll(() => fillShare(page)).toBeCloseTo(1, 1)
  await page.clock.fastForward(1_000)
  await expect(page.getByRole('status').filter({ hasText: 'Rest' })).toHaveText('Rest over')
})

test('the phase is announced once the block is up', async ({ page }) => {
  await logAndRest(page)
  await page.clock.fastForward(500)
  await expect(page.getByRole('status').filter({ hasText: 'Rest' })).toHaveText('Rest started')
})
