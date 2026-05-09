import { expect, test } from '@playwright/test'
import { finishButton, logSet } from './log-set'

const plan = {
  id: 'p1',
  name: 'Push day',
  desc: '',
  exercises: [
    { id: 'e1', name: 'Bench press', muscleGroup: 'Chest' },
    { id: 'e2', name: 'Overhead press', muscleGroup: 'Shoulders' },
  ],
}

// An older session, so "first in Recent" means the new one went on top.
const older = {
  id: 's0',
  planId: 'p1',
  planName: 'Push day',
  date: '2026-11-01',
  notes: '',
  exercises: [{ id: 'e1', name: 'Bench press', muscleGroup: 'Chest', sets: [{ id: 'a', weight: '50', reps: '10' }] }],
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ([p, s]) => {
      if (localStorage.getItem('gym:plans')) return
      localStorage.setItem('gym:plans', JSON.stringify([p]))
      localStorage.setItem('gym:sessions', JSON.stringify([s]))
    },
    [plan, older],
  )
})

test('a session runs from Log home: start, log a set, rest, finish and save', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Log' }).click()
  await expect(page.getByRole('button', { name: /^Training plan: / })).toContainText('Push day')
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Push day')

  await page.getByRole('button', { name: /^Bench press/ }).click()
  await logSet(page, '60', '8')
  await expect(page.getByRole('timer', { name: /^Rest/ })).toBeVisible()

  await page.getByRole('button', { name: 'All exercises' }).click()
  await expect(page.getByRole('button', { name: /^Rest/ })).toContainText('Bench press')

  await finishButton(page).click()
  await expect(page.locator('.finishStat')).toHaveText(['exercise1', 'set1', 'kg moved480'])
  await page.getByLabel('Notes · optional').fill('Good pace')
  await page.getByRole('button', { name: 'Save session' }).click()

  await expect(page.getByRole('heading', { name: 'Log', exact: true })).toBeVisible()
  const recent = page.getByRole('region', { name: 'Recent sessions' }).getByRole('listitem')
  await expect(recent).toHaveCount(2)
  await expect(recent.first()).toContainText('Just savedPush day')
  await expect(page.locator('.logHomeItemSummary').first()).toHaveText('1 set · 480 kg · Good pace')
})
