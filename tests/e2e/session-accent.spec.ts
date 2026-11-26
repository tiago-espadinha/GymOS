import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { restStarted } from './rest-started'

// In a session the current segment, the numbers and the next card's kicker are the accent,
// and the buttons that log a set fill with it. Inverted rows (current, editing) keep black
// numbers, and Start hold and Finish keep their own fills.
const plans = [
  {
    id: 'p1',
    name: 'Push',
    desc: '',
    exercises: [
      { id: 'e1', name: 'Bench Press', muscleGroup: 'Chest' },
      { id: 'e2', name: 'Incline DB Press', muscleGroup: 'Chest' },
      { id: 'e3', name: 'Plank', muscleGroup: 'Core', category: 'calisthenics', trackingType: 'time' },
    ],
  },
]
const sets = [
  { id: 'x0', weight: '60', reps: '10' },
  { id: 'x1', weight: '60', reps: '8' },
]
const sessions = [
  {
    id: 's1',
    planId: 'p1',
    planName: 'Push',
    date: '2026-11-10',
    notes: '',
    exercises: [
      { id: 'e1', name: 'Bench Press', muscleGroup: 'Chest', sets },
      { id: 'e2', name: 'Incline DB Press', muscleGroup: 'Chest', sets },
    ],
  },
]

const accents = { lime: 'rgb(198, 255, 61)', red: 'rgb(255, 64, 64)' }
const BLACK = 'rgb(0, 0, 0)'
const WHITE = 'rgb(255, 255, 255)'
const SURFACE = 'rgb(20, 20, 20)'
const LINE_STRONG = 'rgb(58, 58, 58)'
const MUTED = 'rgb(180, 180, 180)'

const open = async (page: Page, accent: string) => {
  await page.clock.install({ time: new Date('2026-11-15T10:00:00') })
  await page.addInitScript(
    ([p, s, a]) => {
      if (localStorage.getItem('gym:plans')) return
      localStorage.setItem('gym:plans', JSON.stringify(p))
      localStorage.setItem('gym:sessions', JSON.stringify(s))
      localStorage.setItem('gym:tab', JSON.stringify('log'))
      localStorage.setItem('gym:accent', JSON.stringify(a))
    },
    [plans, sessions, accent] as const,
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'Start', exact: true }).click()
}

const axe = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
}

const barColour = (segment: Locator) => segment.evaluate((el) => getComputedStyle(el, '::before').backgroundColor)
const screen = (page: Page, name: string) => page.getByRole('region', { name })
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })

for (const [accent, rgb] of Object.entries(accents)) {
  test.describe(accent, () => {
    test('the session list numbers its rows in the accent, the current row in black', async ({ page }) => {
      await open(page, accent)
      const number = (name: RegExp) => page.getByRole('button', { name }).locator('.list-row__number')
      await expect(page.getByRole('button', { name: /^Bench Press/ })).toHaveCSS('background-color', WHITE)
      await expect(number(/^Bench Press/)).toHaveCSS('color', BLACK)
      await expect(number(/^Incline DB Press/)).toHaveCSS('color', rgb)
      await expect(number(/^Plank/)).toHaveCSS('color', rgb)
      await expect(number(/^Plank/)).toHaveCSS('font-size', '34px')
      await axe(page)
    })

    test('working: current segment, set numbers, Next kicker and Set done use the accent', async ({ page }) => {
      await open(page, accent)
      await page.getByRole('button', { name: /^Bench Press/ }).click()
      const bench = screen(page, 'Bench Press')
      const segments = bench.getByRole('navigation', { name: 'Exercises' }).getByRole('button')
      await expect.poll(() => barColour(segments.nth(0))).toBe(rgb)
      await expect.poll(() => barColour(segments.nth(1))).toBe(LINE_STRONG)

      const setDone = button(page, 'Set done')
      await expect(setDone).toHaveCSS('background-color', rgb)
      await expect(setDone).toHaveCSS('color', BLACK)
      await setDone.click()
      await restStarted(page)
      await page.clock.runFor(5_000)
      await axe(page)
      await button(page, 'End rest').click()

      const labels = bench.locator('.setsTableLabel')
      await expect(labels.nth(0)).toHaveCSS('color', rgb)
      await expect(labels.nth(0)).toHaveCSS('font-size', '24px')
      await expect(labels.nth(1)).toHaveCSS('color', BLACK)
      await expect(bench.locator('.setsTableRow--inverted')).toHaveCSS('background-color', WHITE)

      const card = bench.getByRole('button', { name: /^Next Incline DB Press/ })
      await expect(card.locator('.exerciseNextCardLabel')).toHaveCSS('color', rgb)
      await expect(card).toHaveCSS('background-color', SURFACE)
      await expect(card.locator('.exerciseNextCardName')).toHaveCSS('color', WHITE)
      await axe(page)

      // Editing inverts that row, whose number turns black; the others stay accent.
      await button(page, 'Edit set 1').click()
      await expect(labels.nth(0)).toHaveCSS('color', BLACK)
      await expect(labels.nth(1)).toHaveCSS('color', rgb)
    })

    test('hold: Start hold stays white, Stop and log fills with the accent; the FINISH card has no kicker and is muted until a set', async ({ page }) => {
      await open(page, accent)
      await page.getByRole('button', { name: /^Plank/ }).click()
      const finish = screen(page, 'Plank').getByRole('button', { name: 'Finish session', exact: true })
      await expect(finish.locator('.exerciseNextCardLabel')).toHaveCount(0)
      await expect(finish).toHaveText('Finish session')
      // Finish is disabled, and muted, until a set is logged.
      await expect(finish).toBeDisabled()
      await expect(finish).toHaveCSS('color', MUTED)
      await expect(finish).toHaveCSS('border-color', LINE_STRONG)

      const start = button(page, 'Start hold')
      await expect(start).toHaveCSS('background-color', WHITE)
      await expect(start).toHaveCSS('color', BLACK)
      await start.click()
      await page.clock.runFor(8_000)
      const stop = button(page, 'Stop and log')
      await expect(stop).toHaveCSS('background-color', rgb)
      await expect(stop).toHaveCSS('color', BLACK)
      await axe(page)
      await stop.click()
      // Outlined white once enabled, while other exercises have no set.
      await expect(finish).toBeEnabled()
      await expect(finish).toHaveCSS('color', WHITE)
      await expect(finish).toHaveCSS('border-color', WHITE)
      await expect(finish).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    })

    test('once every exercise has a set, Finish fills white with black text', async ({ page }) => {
      await open(page, accent)
      for (const name of [/^Bench Press/, /^Incline DB Press/]) {
        await page.getByRole('button', { name }).click()
        await button(page, 'Set done').click()
        await restStarted(page)
        await page.getByRole('button', { name: /All exercises/ }).click()
      }
      await page.getByRole('button', { name: /^Plank/ }).click()
      await button(page, 'Start hold').click()
      await page.clock.runFor(8_000)
      await button(page, 'Stop and log').click()
      const card = screen(page, 'Plank').locator('.exerciseNextCard--allDone')
      await expect(card).toHaveCSS('background-color', WHITE)
      await expect(card.locator('.exerciseNextCardName')).toHaveCSS('color', BLACK)
    })
  })
}

test.describe('at 1280', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false })

  test('Set done fills with the accent in the right column', async ({ page }) => {
    await open(page, 'lime')
    await page.getByRole('button', { name: /^Bench Press/ }).click()
    await expect(button(page, 'Set done')).toHaveCSS('background-color', accents.lime)
    await axe(page)
  })
})
