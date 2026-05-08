import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const plans = [
  { id: 'p1', name: 'Push day', desc: 'Chest', exercises: [{ id: 'e1', name: 'Bench press', muscleGroup: 'Chest' }] },
  { id: 'p2', name: 'Old block', desc: '', isArchived: true, exercises: [{ id: 'e2', name: 'Curl', muscleGroup: 'Biceps' }] },
]

const sessions = [
  {
    id: 's1',
    planId: 'p1',
    planName: 'Push day',
    date: '2026-01-05',
    notes: '',
    exercises: [{ id: 'e1', name: 'Bench press', muscleGroup: 'Chest', sets: [{ id: 'x', weight: '60', reps: '8' }] }],
  },
]

const tabs = ['Plans', 'Log', 'Progress']

test('New plan form has no detectable WCAG A/AA violations', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '+ New plan' }).click()
  await page.getByRole('group', { name: 'Exercise 1 category' }).getByRole('button', { name: 'Cardio' }).click()
  await page.getByRole('button', { name: '+ Add exercise' }).click()
  await page.getByRole('button', { name: 'Save plan' }).click()
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
})

for (const tab of tabs) {
  test(`${tab} tab has no detectable WCAG A/AA violations`, async ({ page }) => {
    // Plans and Progress are scanned with data; Log keeps its empty-state scan.
    if (tab !== 'Log') await page.addInitScript((p) => localStorage.setItem('gym:plans', JSON.stringify(p)), plans)
    if (tab === 'Progress') await page.addInitScript((s) => localStorage.setItem('gym:sessions', JSON.stringify(s)), sessions)
    await page.goto('/')
    await page.getByText(tab, { exact: true }).first().click()
    if (tab === 'Plans') await page.getByRole('button', { name: /Show archived/ }).click()
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
  })
}
