import { expect, test, type Page } from '@playwright/test'

// Plans saved while each exercise had its own km/mi choice.
const plan = {
  id: 'p1',
  name: 'Long run',
  desc: '',
  exercises: [
    { id: 'e1', name: 'Run', muscleGroup: 'Cardio', category: 'cardio', trackingType: 'time', trackDistance: true, distanceUnit: 'mi' },
  ],
}

const logRun = async (page: Page, units: object | null, distance: string) => {
  await page.clock.install({ time: new Date('2026-01-05T10:00:00') })
  await page.clock.pauseAt(new Date('2026-01-05T10:00:05'))
  await page.addInitScript(
    ([p, u]) => {
      localStorage.setItem('gym:plans', JSON.stringify([p]))
      if (u) localStorage.setItem('gym:unitPrefs', JSON.stringify(u))
    },
    [plan, units] as const,
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Long run' }).click()
  await page.getByRole('button', { name: /^Run/ }).click()
  await page.getByRole('button', { name: 'Start effort', exact: true }).click()
  await page.getByRole('textbox', { name: 'Distance · set 1' }).fill(distance)
  await page.clock.fastForward(30_000)
  await page.getByRole('button', { name: 'Stop and log', exact: true }).click()
}

const storedDistance = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('gym:activeSession')!).exercises[0].sets[0].distance)

test('a cardio exercise stored in miles logs in miles when mi is chosen', async ({ page }) => {
  await logRun(page, { weight: 'kg', distance: 'mi' }, '3.1')
  await expect(page.locator('.exerciseScreen:not([hidden]) .setsTableValues--done')).toHaveText('00:30 · 3.1 mi')
  expect(await storedDistance(page)).toBe('3.1')
})

test('a cardio exercise stored in miles is entered in km by default and still stored in miles', async ({ page }) => {
  await logRun(page, null, '5')
  await expect(page.locator('.exerciseScreen:not([hidden]) .setsTableValues--done')).toHaveText('00:30 · 5 km')
  expect(Number(await storedDistance(page))).toBeCloseTo(3.10686, 4)
})
