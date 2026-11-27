import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { logSet } from './log-set'
import { restStarted } from './rest-started'

const plan = { id: 'p1', name: 'Push day', desc: '', exercises: [{ id: 'e1', name: 'Bench press', muscleGroup: 'Chest' }] }

test.beforeEach(async ({ page }) => {
  // Paused, so the countdown only moves when a test fast-forwards it.
  await page.clock.install({ time: new Date('2026-01-05T10:00:00') })
  await page.clock.pauseAt(new Date('2026-01-05T10:00:05'))
  await page.addInitScript((p) => {
    if (!localStorage.getItem('gym:plans')) localStorage.setItem('gym:plans', JSON.stringify([p]))
  }, plan)
})

const rest = (page: Page) => page.getByRole('timer', { name: /^Rest/ })

const openBench = async (page: Page) => {
  await page.getByRole('button', { name: 'Start Push day' }).click()
  await page.getByRole('button', { name: /^Bench press/ }).click()
}

const storePrefs = (page: Page, prefs: object) =>
  page.evaluate((value) => localStorage.setItem('gym:timerPrefs', value), JSON.stringify(prefs))

test('a rest starts at the stored length, and one already running keeps its target', async ({ page }) => {
  await page.goto('/')
  await storePrefs(page, { restSec: { strength: 100 } })
  await page.reload()
  await openBench(page)
  await logSet(page, '60', '8')
  await restStarted(page)
  await expect(rest(page)).toContainText('01:40')

  await storePrefs(page, { restSec: { strength: 45 } })
  await page.reload()
  await page.getByRole('button', { name: /^Bench press/ }).click()
  await expect(rest(page)).toContainText('01:40')
  await page.getByRole('button', { name: 'End rest' }).click()
  await logSet(page, '60', '8')
  await restStarted(page)
  await expect(rest(page)).toContainText('00:45')
})

const openSettings = (page: Page) => page.getByRole('button', { name: 'Settings', exact: true }).click()
const field = (page: Page, name: string) => page.getByRole('textbox', { name: `${name} rest` })
const toggle = (page: Page, name: string) => page.getByRole('switch', { name: new RegExp(`^${name}`) })
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gym:timerPrefs') ?? 'null'))

test('Settings shows the default rests, and a typed one is saved on leaving and used by the next rest', async ({ page }) => {
  await page.goto('/')
  await openSettings(page)
  await expect(field(page, 'Strength')).toHaveValue('01:00')
  await expect(field(page, 'Calisthenics')).toHaveValue('00:30')
  await expect(field(page, 'Cardio')).toHaveValue('00:15')

  await field(page, 'Strength').fill('130')
  expect(await stored(page)).toBeNull()
  await field(page, 'Strength').press('Enter')
  await expect(field(page, 'Strength')).toHaveValue('01:30')
  // Empty or zero keeps the old time.
  for (const nothing of ['', '0']) {
    await field(page, 'Strength').fill(nothing)
    await field(page, 'Strength').blur()
    await expect(field(page, 'Strength')).toHaveValue('01:30')
  }

  await page.reload()
  await openSettings(page)
  await expect(field(page, 'Strength')).toHaveValue('01:30')
  await page.getByRole('button', { name: 'Plans', exact: true }).click()
  await openBench(page)
  await logSet(page, '60', '8')
  await restStarted(page)
  await expect(rest(page)).toContainText('01:30')
})

// Counts the cues a rest gives at its target.
const countCues = (page: Page) =>
  page.addInitScript(() => {
    const cues = { beeps: 0, buzzes: 0 }
    Object.assign(window, { cues })
    window.AudioContext = class {
      constructor() {
        cues.beeps += 1
        throw new Error('no audio in tests')
      }
    } as unknown as typeof AudioContext
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: () => ++cues.buzzes > 0 })
  })

for (const on of [true, false]) {
  test(`Sound and Vibration ${on ? 'on: the target beeps and buzzes' : 'off: the target is silent, also after a reload'}`, async ({ page }) => {
    await countCues(page)
    await page.goto('/')
    if (!on) {
      await openSettings(page)
      await toggle(page, 'Sound').click()
      await toggle(page, 'Vibration').click()
      await page.reload()
      await openSettings(page)
      await expect(toggle(page, 'Sound')).toHaveAttribute('aria-checked', 'false')
      await expect(toggle(page, 'Vibration')).toHaveAttribute('aria-checked', 'false')
      await page.getByRole('button', { name: 'Plans', exact: true }).click()
    }
    await openBench(page)
    await logSet(page, '60', '8')
    await restStarted(page)
    await page.clock.fastForward(60_000)
    await expect(rest(page)).toContainText('+0:00')
    const cues = await page.evaluate(() => (window as unknown as { cues: { beeps: number; buzzes: number } }).cues)
    expect(cues).toEqual(on ? { beeps: 1, buzzes: 1 } : { beeps: 0, buzzes: 0 })
  })
}

test('without vibration support there is no Vibration switch', async ({ page }) => {
  await page.addInitScript(() => {
    delete (Navigator.prototype as { vibrate?: unknown }).vibrate
  })
  await page.goto('/')
  await openSettings(page)
  await expect(toggle(page, 'Sound')).toBeVisible()
  await expect(toggle(page, 'Vibration')).toHaveCount(0)
})

test('a refused write leaves the switch as it was and says so', async ({ page }) => {
  await page.goto('/')
  await openSettings(page)
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error('full')
    }
  })
  await toggle(page, 'Sound').click()
  await expect(toggle(page, 'Sound')).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('alert')).toContainText('refused to store your timer choice')
})

test('Settings with the Timers section has no detectable WCAG A/AA violations', async ({ page }) => {
  await page.goto('/')
  await openSettings(page)
  await field(page, 'Strength').focus()
  await page.clock.resume() // axe needs the page's timers
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
})
