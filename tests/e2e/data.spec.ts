import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

const UNITLESS_HEADER = 'type,date,name,desc_notes,exercise,muscle,category,tracking,weight,reps,duration,distance'
const HEADER = `${UNITLESS_HEADER},weight_unit,distance_unit`

const plan = {
  id: 'p1',
  name: 'Pull day',
  desc: '',
  exercises: [{ id: 'e1', name: 'Row', muscleGroup: 'Back', category: 'strength', trackingType: 'reps' }],
}

const session = (date: string) => ({
  id: `s-${date}`,
  planId: 'p1',
  planName: 'Pull day',
  date,
  notes: '',
  exercises: [
    { id: 'e1', name: 'Row', muscleGroup: 'Back', category: 'strength', trackingType: 'reps', sets: [{ id: 'x', weight: '60', reps: '10' }] },
  ],
})

// A new plan, one session already on the device (2026-01-01) and one new session.
const importCsv = [
  UNITLESS_HEADER,
  'plan,,Legs,,Squat,Legs,strength,reps,,,,',
  'session,2026-01-01,Pull day,,Row,Back,strength,reps,60,10,,',
  'session,2026-02-01,Legs,,Squat,Legs,strength,reps,100,5,,',
  'session,2026-02-01,Legs,,Squat', // too few columns
].join('\n')

const csvFile = (name: string, text: string) => ({ name, mimeType: 'text/csv', buffer: Buffer.from(text) })

const stored = (page: Page) =>
  page.evaluate(() => ({
    plans: JSON.parse(localStorage.getItem('gym:plans') ?? '[]') as { name: string }[],
    sessions: JSON.parse(localStorage.getItem('gym:sessions') ?? '[]') as { date: string }[],
  }))

const chooseFile = (page: Page, name: string, text: string) =>
  page.locator('input[type=file]').setInputFiles(csvFile(name, text))

test.beforeEach(async ({ page }) => {
  // Seed once, so a reload keeps what the test changed.
  await page.addInitScript(
    ([p, s]) => {
      if (sessionStorage.getItem('seeded')) return
      sessionStorage.setItem('seeded', '1')
      localStorage.setItem('gym:plans', JSON.stringify([p]))
      localStorage.setItem('gym:sessions', JSON.stringify(s))
    },
    [plan, [session('2026-01-01'), session('2026-01-08')]] as const,
  )
  await page.goto('/')
  await page.getByText('Progress', { exact: true }).first().click()
  await page.getByRole('button', { name: 'Settings' }).click()
})

test('opens from Progress with the device counts, and Close returns to the Settings button', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeFocused()
  await expect(page.locator('.dataCount')).toHaveText(['1 plan', '2 sessions'])
  await expect(page.getByText('Bring in a CSV exported from GymOS')).toBeVisible()
  await expect(page.getByRole('button', { name: /Add to my data|Replace my data/ })).toHaveCount(0)

  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('button', { name: 'Settings' })).toBeFocused()
  await expect(page.getByRole('heading', { name: 'Settings' })).toHaveCount(0)
})

test('Export CSV downloads the data in the export format', async ({ page }) => {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()])

  expect(download.suggestedFilename()).toMatch(/^gym_data_\d{4}-\d{2}-\d{2}\.csv$/)
  const text = await readFile((await download.path())!, 'utf8')
  expect(text.split('\n')).toEqual([
    HEADER,
    'plan,,Pull day,,Row,Back,strength,reps,,,,,,',
    'session,2026-01-01,Pull day,,Row,Back,strength,reps,60,10,,,kg,km',
    'session,2026-01-08,Pull day,,Row,Back,strength,reps,60,10,,,kg,km',
  ])
})

test('with lb chosen, Export writes lb and the file imports back to the same kg', async ({ page }) => {
  await page.getByRole('group', { name: 'Weight unit' }).getByRole('button', { name: 'lb', exact: true }).click()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()])
  const text = await readFile((await download.path())!, 'utf8')
  expect(text.split('\n')[2]).toBe('session,2026-01-01,Pull day,,Row,Back,strength,reps,132.28,10,,,lb,km')

  await chooseFile(page, 'gym_data_lb.csv', text)
  await expect(page.getByText('1 plan and 2 sessions found', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Replace my data/ }).click()
  await expect(page.getByRole('heading', { name: 'Imported' })).toBeFocused()
  const sessions = await page.evaluate(() => JSON.parse(localStorage.getItem('gym:sessions')!))
  expect(sessions.map((s: { exercises: { sets: { weight: string }[] }[] }) => Number(s.exercises[0].sets[0].weight).toFixed(2))).toEqual(['60.00', '60.00'])
})

test('a chosen file shows what was found, and Add keeps existing data', async ({ page }) => {
  await chooseFile(page, 'gym_data_2026-02-01.csv', importCsv)

  await expect(page.getByRole('heading', { name: 'Import · file ready' })).toBeVisible()
  await expect(page.getByText('gym_data_2026-02-01.csv')).toBeVisible()
  await expect(page.getByText('1 plan and 2 sessions found. 1 row skipped: a column, field or unit was missing or unknown.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Replace my data/ })).toContainText('Deletes the 1 plan and 2 sessions on this device first')

  await page.getByRole('button', { name: /Add to my data/ }).click()

  await expect(page.getByText('Added 1 plan and 1 session. 1 session already here was skipped.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Imported' })).toBeFocused()
  await expect(page.getByText('gym_data_2026-02-01.csv')).toBeVisible()
  await expect(page.locator('.dataCount')).toHaveText(['2 plans', '3 sessions'])
  const after = await stored(page)
  expect(after.plans.map((p) => p.name)).toEqual(['Pull day', 'Legs'])
  expect(after.sessions.map((s) => s.date)).toEqual(['2026-01-01', '2026-01-08', '2026-02-01'])

  await page.reload()
  await page.getByText('Progress', { exact: true }).first().click()
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.locator('.dataCount')).toHaveText(['2 plans', '3 sessions'])
})

test('choosing a file with the button moves focus to the import heading', async ({ page }) => {
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Choose a CSV file' }).click()])
  await chooser.setFiles(csvFile('gym.csv', importCsv))

  await expect(page.getByRole('heading', { name: 'Import · file ready' })).toBeFocused()
})

test('Replace swaps the device data for the file', async ({ page }) => {
  await chooseFile(page, 'gym.csv', importCsv)
  await page.getByRole('button', { name: /Replace my data/ }).click()

  await expect(page.getByText('Replaced with 1 plan and 2 sessions.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Imported' })).toBeFocused()
  const after = await stored(page)
  expect(after.plans.map((p) => p.name)).toEqual(['Legs'])
  expect(after.sessions.map((s) => s.date)).toEqual(['2026-01-01', '2026-02-01'])
})

test('Cancel import changes nothing', async ({ page }) => {
  const before = await stored(page)
  await chooseFile(page, 'gym.csv', importCsv)
  await page.getByRole('button', { name: 'Cancel import' }).click()

  await expect(page.getByRole('heading', { name: 'Import', exact: true })).toBeFocused()
  expect(await stored(page)).toEqual(before)
})

test('a file that is not an export shows the error and changes no data', async ({ page }) => {
  const before = await stored(page)
  await chooseFile(page, 'notes.csv', 'name,weight\nRow,60')

  await expect(page.getByRole('heading', { name: "Can't import this file" })).toBeFocused()
  await expect(page.getByText('notes.csv')).toBeVisible()
  await expect(page.getByText('The first line does not match a GymOS export, so nothing was read.')).toBeVisible()
  await expect(page.getByText('Nothing on this device was changed.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Add to my data|Replace my data/ })).toHaveCount(0)
  expect(await stored(page)).toEqual(before)

  await chooseFile(page, 'empty.csv', `${HEADER}\nplan,,Legs`)
  await expect(page.getByText('No plans or sessions found: 1 row skipped because a column, field or unit was missing or unknown.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Choose another file' })).toBeVisible()
})

test('after an import, See progress closes Settings and Import another file opens the chooser', async ({ page }) => {
  await chooseFile(page, 'gym.csv', importCsv)
  await page.getByRole('button', { name: /Add to my data/ }).click()

  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Import another file' }).click()])
  await chooser.setFiles(csvFile('again.csv', importCsv))
  await expect(page.getByRole('heading', { name: 'Import · file ready' })).toBeFocused()
  await page.getByRole('button', { name: /Add to my data/ }).click()
  await expect(page.getByText('Nothing new: every plan and session was already here.')).toBeVisible()

  await page.getByRole('button', { name: 'See progress' }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Settings' })).toBeFocused()
})

test('the Settings screen has no detectable WCAG A/AA violations in each import state', async ({ page }) => {
  const scan = async () =>
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations.map(
      (v) => `${v.id} (${v.nodes.length})`,
    )
  expect(await scan()).toEqual([])
  await chooseFile(page, 'gym.csv', importCsv)
  await expect(page.getByRole('button', { name: /Add to my data/ })).toBeVisible()
  expect(await scan()).toEqual([])
  await page.getByRole('button', { name: /Add to my data/ }).click()
  await expect(page.getByRole('button', { name: 'See progress' })).toBeVisible()
  expect(await scan()).toEqual([])
  await chooseFile(page, 'notes.csv', 'name,weight\nRow,60')
  await expect(page.getByRole('heading', { name: "Can't import this file" })).toBeVisible()
  expect(await scan()).toEqual([])
})
