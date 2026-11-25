import { expect, test } from '@playwright/test'

// Plans saved while each exercise had its own km/mi choice.
const plan = {
  id: 'p1',
  name: 'Long run',
  desc: '',
  exercises: [
    { id: 'e1', name: 'Run', muscleGroup: 'Cardio', category: 'cardio', trackingType: 'time', trackDistance: true, distanceUnit: 'mi' },
  ],
}

test('a cardio exercise stored in miles still loads and logs in miles', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-05T10:00:00') })
  await page.clock.pauseAt(new Date('2026-01-05T10:00:05'))
  await page.addInitScript((p) => localStorage.setItem('gym:plans', JSON.stringify([p])), plan)
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Long run' }).click()
  await page.getByRole('button', { name: /^Run/ }).click()

  await page.getByRole('button', { name: 'Start effort', exact: true }).click()
  await page.getByRole('textbox', { name: 'Distance · set 1' }).fill('3.1')
  await page.clock.fastForward(30_000)
  await page.getByRole('button', { name: 'Stop and log', exact: true }).click()
  await expect(page.locator('.exerciseScreen:not([hidden]) .setsTableValues--done')).toHaveText('00:30 · 3.1 mi')
})
