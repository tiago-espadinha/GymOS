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
