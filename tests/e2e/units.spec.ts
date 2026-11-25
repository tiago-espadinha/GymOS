import { expect, test, type Page } from '@playwright/test'
import { finishButton, logSet } from './log-set'

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)

const plan = {
  id: 'p1',
  name: 'Push day',
  desc: '',
  exercises: [
    { id: 'e1', name: 'Bench press', muscleGroup: 'Chest' },
    { id: 'e2', name: 'Run', muscleGroup: 'Cardio', category: 'cardio', trackingType: 'time', trackDistance: true },
  ],
}

// Stored in kg and km, as every session is.
const history = [
  {
    id: 'h1',
    planId: 'p1',
    planName: 'Push day',
    date: daysAgo(3),
    notes: '',
    exercises: [
      { id: 'e1', name: 'Bench press', muscleGroup: 'Chest', sets: [{ id: 'a', weight: '100', reps: '5', completed: true }] },
      {
        id: 'e2', name: 'Run', muscleGroup: 'Cardio', category: 'cardio', trackingType: 'time', trackDistance: true,
        sets: [{ id: 'b', weight: '', reps: '', duration: '1500', distance: '5', completed: true }],
      },
    ],
  },
]

const seed = (page: Page, units: { weight: string; distance: string }) =>
  page.addInitScript(
    ([p, s, u]) => {
      if (sessionStorage.getItem('seeded')) return
      sessionStorage.setItem('seeded', '1')
      localStorage.setItem('gym:plans', JSON.stringify([p]))
      localStorage.setItem('gym:sessions', JSON.stringify(s))
      localStorage.setItem('gym:unitPrefs', JSON.stringify(u))
    },
    [plan, history, units] as const,
  )

const activeSet = (page: Page, exercise: string) =>
  page.evaluate((name) => {
    const session = JSON.parse(localStorage.getItem('gym:activeSession') ?? 'null')
    return session?.exercises?.find((e: { name: string }) => e.name === name)?.sets?.[0] ?? null
  }, exercise)

const doneRows = (page: Page) => page.locator('.exerciseScreen:not([hidden]) .setsTableValues--done')

test('with lb chosen, weights read and are entered in lb on every Log screen', async ({ page }) => {
  await seed(page, { weight: 'lbs', distance: 'km' })
  await page.goto('/')
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Log' }).click()
  await expect(page.getByRole('region', { name: 'Recent sessions' }).getByRole('listitem').first()).toContainText('2 sets · 1,102 lb')
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Plans' }).click()

  await page.getByRole('button', { name: 'Start Push day' }).click()
  await expect(page.getByRole('button', { name: /^Bench press/ })).toContainText('Last 220.5 lb × 5')
  await page.getByRole('button', { name: /^Bench press/ }).click()
  await expect(page.getByText('Last time 220.5 lb × 5')).toBeVisible()

  const weight = page.getByRole('textbox', { name: 'Weight', exact: true })
  await expect(weight).toHaveValue('220.5')
  await expect(page.locator('.exerciseScreen:not([hidden]) .setsTable')).toContainText('220.5 lb × 5')
  // Five characters still fit the half-width block.
  expect(await weight.evaluate((el: HTMLInputElement) => el.scrollWidth <= el.clientWidth)).toBe(true)
  await expect(page.getByRole('group', { name: 'Weight' }).first()).toContainText('lb')
  await page.getByRole('button', { name: 'Increase Weight' }).click()
  await expect(weight).toHaveValue('225.5')

  await logSet(page, '135', '5')
  await page.getByRole('button', { name: 'End rest' }).click()
  await expect(doneRows(page)).toHaveText('135 lb × 5')
  expect(Number((await activeSet(page, 'Bench press')).weight)).toBeCloseTo(61.23497, 5)

  await page.reload()
  await page.getByRole('button', { name: /^Bench press/ }).click()
  await expect(doneRows(page)).toHaveText('135 lb × 5')

  await page.getByRole('button', { name: 'Edit set 1' }).click()
  await expect(page.getByRole('textbox', { name: 'Weight', exact: true })).toHaveValue('135')
  await page.getByRole('button', { name: 'Save set 1' }).click()
  expect(Number((await activeSet(page, 'Bench press')).weight)).toBeCloseTo(61.23497, 5)

  await page.getByRole('button', { name: 'All exercises' }).click()
  await expect(page.getByRole('button', { name: /^Bench press/ })).toContainText('135 lb × 5')
  await finishButton(page).click()
  await expect(page.locator('.finishStat')).toHaveText(['exercise1', 'set1', 'lb moved675'])
  await expect(page.locator('.finishRow')).toContainText('1 × 135 lb × 5')
})

test('with lb chosen, Stats figures and the chart read in lb', async ({ page }) => {
  await seed(page, { weight: 'lbs', distance: 'km' })
  await page.goto('/')
  await page.getByText('Stats', { exact: true }).first().click()
  await page.getByRole('group', { name: 'Metric' }).getByRole('button', { name: 'Peak', exact: true }).click()
  await expect(page.locator('.progressStatValue').first()).toHaveText('220.5lb × 5')
  // Axis ticks are whole numbers: 220 and 221 lb rather than 100 kg.
  await expect(page.locator('.progressChart')).toContainText('220')
  await expect(page.locator('.progressChart')).not.toContainText('100')
})

test('with mi chosen, a km-stored 5 reads 3.11 mi and a typed distance is stored in km', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-05T10:00:00') })
  await page.clock.pauseAt(new Date('2026-01-05T10:00:05'))
  await seed(page, { weight: 'kg', distance: 'mi' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Push day' }).click()
  await expect(page.getByRole('button', { name: /^Run/ })).toContainText('Last 25:00 · 3.11 mi')
  await page.getByRole('button', { name: /^Run/ }).click()

  await page.getByRole('button', { name: 'Start effort', exact: true }).click()
  await page.getByRole('textbox', { name: 'Distance · set 1' }).fill('3.1')
  await page.clock.fastForward(30_000)
  await page.getByRole('button', { name: 'Stop and log', exact: true }).click()
  await expect(doneRows(page)).toHaveText('00:30 · 3.1 mi')
  expect(Number((await activeSet(page, 'Run')).distance)).toBeCloseTo(4.98897, 4)
})

test('switching units mid-session changes what is shown, not what is stored', async ({ page }) => {
  await seed(page, { weight: 'lbs', distance: 'km' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Push day' }).click()
  await page.getByRole('button', { name: /^Bench press/ }).click()
  await logSet(page, '135', '5')
  await page.getByRole('button', { name: 'End rest' }).click()
  const stored = await page.evaluate(() => ({
    active: localStorage.getItem('gym:activeSession'),
    plans: localStorage.getItem('gym:plans'),
    sessions: localStorage.getItem('gym:sessions'),
  }))

  // The tab bar is hidden during a session, so the choice is made as Settings stores it.
  await page.evaluate(() => localStorage.setItem('gym:unitPrefs', JSON.stringify({ weight: 'kg', distance: 'km' })))
  await page.reload()
  await expect(page.getByRole('button', { name: /^Bench press/ })).toContainText('61.2 kg × 5')
  await page.getByRole('button', { name: /^Bench press/ }).click()
  await expect(doneRows(page)).toHaveText('61.2 kg × 5')
  expect(
    await page.evaluate(() => ({
      active: localStorage.getItem('gym:activeSession'),
      plans: localStorage.getItem('gym:plans'),
      sessions: localStorage.getItem('gym:sessions'),
    })),
  ).toEqual(stored)
})
