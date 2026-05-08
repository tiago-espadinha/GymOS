import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
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

const inputs = (page: Page) => page.locator('input[placeholder="0"]:visible')
const setDone = (page: Page) => page.getByRole('button', { name: 'Set done' })
const timer = (page: Page) => page.getByRole('timer', { name: /^Rest/ })

const logAndRest = async (page: Page) => {
  await inputs(page).nth(0).fill('60')
  await inputs(page).nth(1).fill('8')
  await setDone(page).click()
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
  // The next set is ready but empty, so it does not count as done.
  await expect(inputs(page).nth(2)).toHaveValue('')
  await expect(setDone(page)).toBeDisabled()
})

test('the block fills in step with the elapsed rest', async ({ page }) => {
  await logAndRest(page)
  await page.clock.fastForward(15_000)
  await expect.poll(() => fillShare(page)).toBeCloseTo(0.25, 1)
  await page.clock.fastForward(15_000)
  await expect.poll(() => fillShare(page)).toBeCloseTo(0.5, 1)
  await expect(timer(page)).toContainText('00:30')
})

test('−15s and +15s move the target; Skip ends the rest', async ({ page }) => {
  await logAndRest(page)
  await page.getByRole('button', { name: '+15s' }).click()
  await expect(page.getByText('Target 01:15').first()).toBeVisible()
  await page.getByRole('button', { name: '−15s' }).click()
  await page.getByRole('button', { name: '−15s' }).click()
  await expect(page.getByText('Target 00:45').first()).toBeVisible()
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect(timer(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Rest/ })).toHaveCount(0)
})

test('a finished rest counts up as +m:ss, here and on the strip', async ({ page }) => {
  await logAndRest(page)
  await page.clock.fastForward(75_000)
  await expect(timer(page)).toContainText('+0:15')
  await expect.poll(() => fillShare(page)).toBeCloseTo(1, 1)
  await page.getByRole('button', { name: 'All exercises' }).click()
  await page.clock.fastForward(1_000)
  await expect(page.getByRole('button', { name: /^Rest/ })).toContainText('+0:16')
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

test('−15s down to zero reads as a finished rest, not an empty one', async ({ page }) => {
  await logAndRest(page)
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: '−15s' }).click()
  await expect(page.getByText('Target 00:00').first()).toBeVisible()
  await expect.poll(() => fillShare(page)).toBeCloseTo(1, 1)
  await page.clock.fastForward(1_000)
  await expect(page.getByRole('status').filter({ hasText: 'Rest' })).toHaveText('Rest over')
})

test('the phase is announced once the block is up', async ({ page }) => {
  await logAndRest(page)
  await page.clock.fastForward(500)
  await expect(page.getByRole('status').filter({ hasText: 'Rest' })).toHaveText('Rest started')
})

test('removing the set that is resting ends the rest', async ({ page }) => {
  await logAndRest(page)
  await page.locator('.setRow').first().locator('.setRowRemove').click()
  await expect(page.locator('.setRow:visible')).toHaveCount(1)
  await expect(timer(page)).toHaveCount(0)
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.endsWith('-rest')))).toEqual([])
})
