import { expect, test, type Locator, type Page } from '@playwright/test'
import { restStarted } from './rest-started'

// While a rest runs on one exercise, another exercise's screen shows the rest strip
// above its header. The strip must not cover "‹ All exercises", the plan name or the set count.
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
// Last time's sets prefill the first set, so "Set done" is ready at once.
const sessions = [
  {
    id: 's1',
    planId: 'p1',
    planName: 'Push',
    date: '2026-11-10',
    notes: '',
    exercises: [{ id: 'e1', name: 'Bench Press', muscleGroup: 'Chest', sets: [{ id: 'x0', weight: '60', reps: '10' }] }],
  },
]

const SIZES = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
]

const box = async (locator: Locator) => {
  const b = await locator.boundingBox()
  expect(b).not.toBeNull()
  return b!
}

const intersects = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

async function openOtherExerciseDuringRest(page: Page) {
  await page.clock.install({ time: new Date('2026-11-15T10:00:00') })
  await page.addInitScript(
    ([p, s]) => {
      if (localStorage.getItem('gym:plans')) return
      localStorage.setItem('gym:plans', JSON.stringify(p))
      localStorage.setItem('gym:sessions', JSON.stringify(s))
      localStorage.setItem('gym:tab', JSON.stringify('log'))
    },
    [plans, sessions] as const,
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.getByRole('button', { name: /^Bench Press/ }).click()
  await page.getByRole('button', { name: 'Set done', exact: true }).click()
  await restStarted(page)
  await page.getByRole('navigation', { name: 'Exercises' }).getByRole('button', { name: /^Incline DB Press/ }).click()
}

for (const size of SIZES) {
  test(`rest strip clears the exercise header at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size)
    await openOtherExerciseDuringRest(page)

    const strip = page.getByRole('button', { name: /^Rest .*Bench Press$/ })
    const screen = page.locator('.exerciseScreen:not([hidden])')
    const back = screen.getByRole('button', { name: /All exercises/ })
    const plan = screen.locator('.exerciseScreenPlan')
    const setCount = screen.locator('.exerciseScreenSet')

    // Both the strip and the header are on screen, so the check cannot pass by hiding either.
    await expect(strip).toBeVisible()
    await expect(strip).toContainText('Bench Press')
    await expect(back).toBeVisible()
    await expect(plan).toHaveText('Push')
    await expect(setCount).toHaveText(/Set 1 of/i)

    // Leave a visible gap: with none, the header looks tucked under the strip.
    const stripBox = await box(strip)
    for (const target of [back, plan, setCount]) {
      const targetBox = await box(target)
      expect(intersects(stripBox, targetBox)).toBe(false)
      expect(targetBox.y - (stripBox.y + stripBox.height)).toBeGreaterThanOrEqual(8)
    }
  })
}
