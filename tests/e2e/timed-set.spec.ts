import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { restStarted } from './rest-started'

const plan = {
  id: 'p1',
  name: 'Core day',
  desc: '',
  exercises: [
    { id: 'e1', name: 'Plank', muscleGroup: 'Core', category: 'calisthenics', trackingType: 'time' },
  ],
}

test.beforeEach(async ({ page }) => {
  // Paused, so the clock only moves when a test fast-forwards it.
  await page.clock.install({ time: new Date('2026-01-05T10:00:00') })
  await page.clock.pauseAt(new Date('2026-01-05T10:00:05'))
  await page.addInitScript((p) => {
    if (!localStorage.getItem('gym:plans')) localStorage.setItem('gym:plans', JSON.stringify([p]))
  }, plan)
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Core day' }).click()
  await page.getByRole('button', { name: /^Plank/ }).click()
})

const hold = (page: Page) => page.getByRole('timer', { name: /^Hold/ })
const rest = (page: Page) => page.getByRole('timer', { name: /^Rest/ })
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })

// Height of the white fill as a share of the block.
const fillShare = (page: Page) =>
  page.evaluate(() => {
    const block = document.querySelector('.timerBlock')!.getBoundingClientRect()
    const fill = document.querySelector('.timerBlockFill')!.getBoundingClientRect()
    return fill.height / block.height
  })

test('idle shows the category target (calisthenics: 15s) and Start begins the hold', async ({ page }) => {
  await expect(hold(page)).toContainText('00:15')
  expect(await fillShare(page)).toBe(0)
  await button(page, 'Start').click()
  await page.clock.fastForward(5_000)
  await expect(hold(page)).toContainText('00:10')
})

test('the hold fills white in step with elapsed time', async ({ page }) => {
  await button(page, 'Start').click()
  await page.clock.fastForward(5_000)
  await expect.poll(() => fillShare(page)).toBeCloseTo(1 / 3, 1)
  await page.clock.fastForward(5_000)
  await expect.poll(() => fillShare(page)).toBeCloseTo(2 / 3, 1)
  const fill = await page.locator('.timerBlockFill').evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(fill).toBe('rgb(255, 255, 255)')
})

test('at the target the hold is logged and a lime rest starts; Skip saves the rest taken', async ({ page }) => {
  await button(page, 'Start').click()
  await page.clock.fastForward(15_000)
  await expect(hold(page)).toHaveCount(0)
  await expect(rest(page)).toBeVisible()
  const fill = await page.locator('.timerBlockFill').evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(fill).toBe('rgb(198, 255, 61)')
  await restStarted(page)
  await page.clock.fastForward(10_000)
  await button(page, 'Skip').click()
  await expect(rest(page)).toHaveCount(0)
  await expect(page.locator('.timedSetRowLogged')).toHaveText('00:15 · rest 00:10')
  // The next set is ready with the same target.
  await expect(hold(page)).toContainText('00:15')
})

test('Finish early records the time held, not the target', async ({ page }) => {
  await button(page, 'Start').click()
  await page.clock.fastForward(7_000)
  await button(page, 'Finish').click()
  await expect(rest(page)).toBeVisible()
  await button(page, 'Skip').click()
  await expect(page.locator('.timedSetRowLogged')).toHaveText('00:07 · rest 00:00')
})

test('with the rest chain off the hold runs on as overtime and no rest starts', async ({ page }) => {
  await page.getByLabel('Chain rest timer').uncheck()
  await button(page, 'Start').click()
  await page.clock.fastForward(20_000)
  await expect(hold(page)).toContainText('+0:05')
  await button(page, 'Finish').click()
  await expect(rest(page)).toHaveCount(0)
  await expect(page.locator('.timedSetRowLogged')).toHaveText('00:20')
})

test('Pause stops the clock and Resume continues it; +step lengthens the target', async ({ page }) => {
  await button(page, 'Start').click()
  await page.clock.fastForward(4_000)
  await button(page, 'Pause').click()
  await page.clock.fastForward(30_000)
  await expect(hold(page)).toContainText('00:11')
  await button(page, 'Resume').click()
  await button(page, '+5s').click()
  await expect(page.getByText('Target 00:20').first()).toBeVisible()
})

test('a running hold survives a reload and follows the real clock', async ({ page }) => {
  await button(page, 'Start').click()
  await page.clock.fastForward(6_000)
  await page.reload()
  await page.getByRole('button', { name: /^Plank/ }).click()
  await page.clock.fastForward(1_000)
  await expect(hold(page)).toContainText('00:08')
})

test('phase changes are announced once the block is up', async ({ page }) => {
  await button(page, 'Start').click()
  await page.clock.fastForward(500)
  await expect(page.getByRole('status').filter({ hasText: 'Hold' })).toHaveText('Hold running')
})

test('the timed set view has no detectable WCAG A/AA violations', async ({ page }) => {
  await button(page, 'Start').click()
  await page.clock.fastForward(5_000)
  await page.clock.resume() // axe needs the page's timers
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.html + n.any.map((a) => a.message).join())}`)).toEqual([])
})

test('"+ Set" is not offered while a hold is pending', async ({ page }) => {
  await expect(button(page, '+ Set')).toHaveCount(0)
  await button(page, 'Start').click()
  await page.clock.fastForward(7_000)
  await button(page, 'Finish').click()
  await button(page, 'Skip').click()
  await expect(page.locator('.timedSetRowLogged')).toHaveCount(1)
  await expect(button(page, '+ Set')).toHaveCount(0)
})

test('editing a saved timed session keeps its last set; "+ Set" then adds a hold', async ({ page }) => {
  await button(page, 'Start').click()
  await page.clock.fastForward(7_000)
  await button(page, 'Finish').click()
  await button(page, 'Skip').click()
  await page.getByRole('button', { name: 'Finish session' }).click()
  await page.getByRole('button', { name: 'Save session' }).click()
  // Imported or older sets carry no "completed" flag.
  await page.evaluate(() => {
    const sessions = JSON.parse(localStorage.getItem('gym:sessions')!)
    for (const s of sessions) for (const e of s.exercises) for (const set of e.sets) delete set.completed
    localStorage.setItem('gym:sessions', JSON.stringify(sessions))
  })
  await page.reload()
  await page.getByRole('button', { name: /^Edit/ }).first().click()
  await page.getByRole('button', { name: /^Plank/ }).click()
  await expect(page.locator('.timedSetRowLogged')).toHaveText('00:07 · rest 00:00')
  await expect(hold(page)).toHaveCount(0)
  await button(page, '+ Set').click()
  await expect(hold(page)).toBeVisible()
})

test('cancelling a session forgets a hold in progress', async ({ page }) => {
  await button(page, 'Start').click()
  await page.clock.fastForward(3_000)
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Cancel' }).click()
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.endsWith('-work')))
  expect(keys).toEqual([])
})

test('the minus button stops at the smallest step so a hold always has a target', async ({ page }) => {
  await button(page, '−5s').click()
  await button(page, '−5s').click()
  await expect(page.getByText('Target 00:05').first()).toBeVisible()
  await expect(button(page, '−5s')).toBeDisabled()
})
