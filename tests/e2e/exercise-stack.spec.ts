import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { restStarted } from './rest-started'

// The steppers, Set done and the next card are one stack at the bottom of the exercise
// screen, in the page's flow: a long table or a two-line name pushes it down and the page
// scrolls; nothing overlaps. On wide it sits in the right column, steppers side by side.
const LONG_NAME = 'Single arm dumbbell romanian deadlift'
const plan = {
  id: 'p1',
  name: 'Pull',
  desc: '',
  exercises: [
    { id: 'e1', name: 'Bench press', muscleGroup: 'Chest' },
    { id: 'e2', name: 'Long row', muscleGroup: 'Back' },
    { id: 'e3', name: LONG_NAME, muscleGroup: 'Legs' },
  ],
}
const sets = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `x${i}`, weight: '40', reps: '10' }))
const sessions = [
  {
    id: 's1',
    planId: 'p1',
    planName: 'Pull',
    date: '2026-11-10',
    notes: '',
    exercises: [
      { id: 'e1', name: 'Bench press', muscleGroup: 'Chest', sets: sets(3) },
      { id: 'e2', name: 'Long row', muscleGroup: 'Back', sets: sets(10) },
      { id: 'e3', name: LONG_NAME, muscleGroup: 'Legs', sets: sets(4) },
    ],
  },
]

// A new session, or one resumed with the saved session's sets already logged.
const open = async (page: Page, exercise: RegExp, resumed = false) => {
  await page.clock.install({ time: new Date('2026-11-15T10:00:00') })
  await page.addInitScript(
    ([p, s, active]) => {
      if (localStorage.getItem('gym:plans')) return
      localStorage.setItem('gym:plans', JSON.stringify(p))
      localStorage.setItem('gym:sessions', JSON.stringify(s))
      if (active) localStorage.setItem('gym:activeSession', JSON.stringify(active))
    },
    [[plan], sessions, resumed ? { ...sessions[0], id: undefined, date: '2026-11-15' } : null] as const,
  )
  await page.goto('/')
  // A resumed session opens on its list, with no tab bar.
  if (!resumed) {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Log' }).click()
    await page.getByRole('button', { name: 'Start', exact: true }).click()
  }
  await page.getByRole('button', { name: exercise }).click()
}

const shown = (page: Page, selector: string) => page.locator(`.exerciseScreen:not([hidden]) ${selector}`)
const box = async (locator: Locator) => (await locator.boundingBox())!
const bottom = (b: { y: number; height: number }) => b.y + b.height
const steppers = (page: Page) => shown(page, '.stepper-block').all()
const setDone = (page: Page) => page.getByRole('button', { name: 'Set done' })
const card = (page: Page) => shown(page, '.exerciseNextCard')
const docHeight = (page: Page) => page.evaluate(() => document.documentElement.scrollHeight)
const intersects = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

// Steppers, then Set done, then the card, top to bottom, 12 apart, none overlapping.
const expectStack = async (page: Page) => {
  const [first] = await Promise.all((await steppers(page)).map(box))
  const done = await box(setDone(page))
  const next = await box(card(page))
  expect(done.y - bottom(first)).toBeCloseTo(12, 0)
  expect(next.y - bottom(done)).toBeCloseTo(12, 0)
  return { first, done, next }
}

test.describe('phone, 375×812', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('a short table: the stack sits at the bottom of the viewport and the page does not scroll', async ({ page }) => {
    await open(page, /^Bench press/)
    const { first, next } = await expectStack(page)
    expect(await docHeight(page)).toBe(812)
    expect(bottom(next)).toBeLessThanOrEqual(812)
    expect(bottom(next)).toBeGreaterThan(812 - 48)
    // The free space opens between the table and the stack, not under the card.
    const table = await box(shown(page, '.setsTable'))
    expect(first.y - bottom(table)).toBeGreaterThan(24)
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(violations).toEqual([])
  })

  test('a long table pushes the stack down: the page scrolls and nothing overlaps', async ({ page }) => {
    await open(page, /^Long row/, true)
    await expect(shown(page, '.setsTableRow')).toHaveCount(11)
    expect(await docHeight(page)).toBeGreaterThan(812)
    const { first } = await expectStack(page)
    const table = await box(shown(page, '.setsTable'))
    expect(first.y).toBeGreaterThanOrEqual(bottom(table))
  })

  test('a two-line name pushes the stack down and nothing overlaps', async ({ page }) => {
    await open(page, /^Single arm/)
    const title = await box(page.getByRole('heading', { name: LONG_NAME }))
    expect(title.height).toBeGreaterThan(60)
    const table = await box(shown(page, '.setsTable'))
    expect(table.y).toBeGreaterThanOrEqual(bottom(title))
    const { first } = await expectStack(page)
    expect(first.y).toBeGreaterThanOrEqual(bottom(table))
  })

  test('during a rest the steppers sit straight above the card at the bottom', async ({ page }) => {
    await open(page, /^Bench press/)
    await setDone(page).click()
    await restStarted(page)
    await expect(setDone(page)).toHaveCount(0)
    const [first] = await Promise.all((await steppers(page)).map(box))
    const next = await box(card(page))
    expect(next.y - bottom(first)).toBeCloseTo(12, 0)
    expect(bottom(next)).toBeLessThanOrEqual(812)
  })
})

for (const viewport of [
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
]) {
  test.describe(`wide, ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport, isMobile: false, hasTouch: false })

    for (const exercise of [/^Bench press/, /^Long row/, /^Single arm/]) {
      test(`${exercise.source.slice(1)}: steppers side by side and Set done clear of both`, async ({ page }) => {
        await open(page, exercise, true)
        const [weight, reps] = await Promise.all((await steppers(page)).map(box))
        expect(weight.y).toBe(reps.y)
        expect(weight.x + weight.width).toBeLessThan(reps.x)
        const done = await box(setDone(page))
        expect(intersects(done, weight)).toBe(false)
        expect(intersects(done, reps)).toBe(false)
        await expectStack(page)
        expect(bottom(done)).toBeLessThanOrEqual(await docHeight(page))
      })
    }

    test('during a rest the card ends level with End rest', async ({ page }) => {
      await open(page, /^Bench press/)
      await setDone(page).click()
      await restStarted(page)
      const next = await box(card(page))
      const end = await box(page.getByRole('button', { name: 'End rest', exact: true }))
      expect(bottom(next)).toBeCloseTo(bottom(end), 0)
    })
  })
}
