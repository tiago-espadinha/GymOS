import { expect, test } from '@playwright/test'
import { logSet } from './log-set'

const squat = { id: 'e1', name: 'Squat', muscleGroup: 'Legs' }
const row = { id: 'e2', name: 'Cable row', muscleGroup: 'Back' }
const plank = { id: 'e3', name: 'Plank', muscleGroup: 'Core', trackingType: 'time' }
const run = { id: 'e4', name: 'Running', muscleGroup: 'Legs', category: 'cardio', trackingType: 'time', trackDistance: true }

const plan = { id: 'p1', name: 'Full body', desc: '', exercises: [squat, row, plank, run] }

// Every later exercise has a last time that the card must leave out.
const history = [{
  id: 's1', planId: 'p1', planName: 'Full body', date: '2026-11-08', notes: '',
  exercises: [
    { ...row, sets: [{ id: 'a', weight: '35', reps: '12' }, { id: 'b', weight: '35', reps: '12' }] },
    { ...plank, sets: [{ id: 'c', duration: '45' }, { id: 'd', duration: '45' }] },
    { ...run, sets: [{ id: 'e', duration: '600', distance: '2' }] },
  ],
}]

for (const viewport of [{ width: 375, height: 812 }, { width: 1280, height: 800 }]) {
  test(`the next card is only "Next" and the exercise name at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.addInitScript(([p, h]) => {
      localStorage.setItem('gym:plans', JSON.stringify([p]))
      localStorage.setItem('gym:sessions', JSON.stringify(h))
    }, [plan, history] as const)
    await page.goto('/')
    await page.getByRole('button', { name: 'Start Full body' }).click()
    await page.getByRole('button', { name: /^Squat/ }).click()

    const next = page.getByRole('button', { name: /^Next / })
    for (const name of ['Cable row', 'Plank', 'Running']) {
      await expect(next).toHaveText(`Next ${name}`)
      await next.click()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
    }

    // Sets logged today add nothing to the card either.
    const segments = page.getByRole('navigation', { name: 'Exercises' }).getByRole('button')
    await segments.nth(1).click()
    await logSet(page, '35', '12')
    await segments.nth(0).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Squat')
    await expect(next).toHaveText('Next Cable row')
  })
}
