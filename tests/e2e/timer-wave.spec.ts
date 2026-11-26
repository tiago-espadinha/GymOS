import { expect, test, type Page } from '@playwright/test'
import { logSet } from './log-set'
import { restStarted } from './rest-started'

// While a rest or hold runs, the fill's top edge is a travelling wave (a mask on
// the fill); empty, full, paused and reduced-motion fills stay flat.

const shown = (page: Page, selector: string) => page.locator(`.exerciseScreen:not([hidden]) ${selector}`)
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })

const fillState = (page: Page) =>
  shown(page, '.timerBlockFill').evaluate((el) => ({
    mask: getComputedStyle(el).maskImage,
    // The height transition is an animation too; count only the wave.
    animations: el.getAnimations().filter((a) => (a as CSSAnimation).animationName?.startsWith('timerBlockWave')).length,
    share: el.getBoundingClientRect().height / el.parentElement!.getBoundingClientRect().height,
  }))

const expectWave = async (page: Page) => {
  await expect(shown(page, '.timerBlock')).toHaveClass(/timerBlock--filling/)
  await expect.poll(async () => (await fillState(page)).mask).toContain('url(')
  await expect.poll(async () => (await fillState(page)).animations).toBe(1)
}

const expectFlat = async (page: Page) => {
  await expect(shown(page, '.timerBlock')).not.toHaveClass(/timerBlock--filling/)
  // WebKit can report an empty mask for a moment after the class changes.
  await expect.poll(async () => (await fillState(page)).mask).toBe('none')
  await expect.poll(async () => (await fillState(page)).animations).toBe(0)
}

const start = async (page: Page, plan: object, name: string, exercise: RegExp) => {
  // Paused, so the timers only move when a test fast-forwards them.
  await page.clock.install({ time: new Date('2026-01-05T10:00:00') })
  await page.clock.pauseAt(new Date('2026-01-05T10:00:05'))
  await page.addInitScript((p) => {
    if (!localStorage.getItem('gym:plans')) localStorage.setItem('gym:plans', JSON.stringify([p]))
  }, plan)
  await page.goto('/')
  await page.getByRole('button', { name: `Start ${name}` }).click()
  await page.getByRole('button', { name: exercise }).click()
}

test.describe('rest', () => {
  test.beforeEach(async ({ page }) => {
    await start(page, { id: 'p1', name: 'Push day', desc: '', exercises: [{ id: 'e1', name: 'Bench press', muscleGroup: 'Chest' }] }, 'Push day', /^Bench press/)
    await logSet(page, '60', '8')
    await restStarted(page)
  })

  test('a running rest waves, and the edge goes flat once the rest is over', async ({ page }, testInfo) => {
    await page.clock.fastForward(20_000)
    await expect.poll(async () => (await fillState(page)).share).toBeGreaterThan(0.1)
    await expectWave(page)
    await page.screenshot({ path: testInfo.outputPath('rest-wave.png') })
    await page.clock.fastForward(300_000)
    await expect(page.getByRole('timer', { name: /^Rest/ })).toContainText('+')
    await expectFlat(page)
    // The height transition runs on real time, not the paused clock.
    await expect.poll(async () => (await fillState(page)).share).toBe(1)
  })

  test('reduced motion keeps the flat fill, still growing with time', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.clock.fastForward(20_000)
    await expect.poll(async () => (await fillState(page)).share).toBeGreaterThan(0.1)
    const state = await fillState(page)
    expect(state.mask).toBe('none')
    expect(state.animations).toBe(0)
    expect(await shown(page, '.timerBlockFill').evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s')
  })
})

test.describe('hold', () => {
  test.beforeEach(async ({ page }) => {
    const plan = { id: 'p1', name: 'Core day', desc: '', exercises: [{ id: 'e1', name: 'Plank', muscleGroup: 'Core', category: 'calisthenics', trackingType: 'time' }] }
    await start(page, plan, 'Core day', /^Plank/)
  })

  test('a hold waves only while it runs: flat when ready, paused or past its target', async ({ page }) => {
    await expectFlat(page)
    await button(page, 'Start hold').click()
    await page.clock.fastForward(5_000)
    await expectWave(page)
    await button(page, 'Pause').click()
    await expectFlat(page)
    expect((await fillState(page)).share).toBeGreaterThan(0)
    await button(page, 'Resume').click()
    await page.clock.fastForward(2_000)
    await expectWave(page)
    // Past the target the hold is full and keeps counting: flat.
    await page.clock.fastForward(15_000)
    await expect(page.getByRole('timer', { name: /^Hold/ })).toContainText('+')
    await expectFlat(page)
  })
})
