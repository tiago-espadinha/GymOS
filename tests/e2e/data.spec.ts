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
  await page.getByRole('button', { name: 'Settings' }).click()
})

const card = (page: Page) => page.locator('.dataCard')
// Where the card sits on the page and what it says, independent of scrolling.
const cardState = (page: Page) =>
  card(page).evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { top: r.top + window.scrollY, width: r.width, height: r.height, text: el.textContent }
  })
const sheet = (page: Page) => page.getByRole('dialog')
const pick = async (page: Page, button: string, name: string, text: string) => {
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: button, exact: true }).click()])
  await chooser.setFiles(csvFile(name, text))
}

test('the Data card shows the counts, Export and Import as a pair, and no import choices', async ({ page }) => {
  await expect(card(page).locator('.dataCard__counts')).toHaveText('1 plan · 2 sessions')
  await expect(card(page).getByRole('button')).toHaveText(['Export', 'Import'])
  const [exp, imp] = await Promise.all(
    ['Export', 'Import'].map(async (name) => (await card(page).getByRole('button', { name }).boundingBox())!),
  )
  expect(exp.width).toBe(imp.width)
  expect(exp.height).toBe(52)
  await expect(card(page)).toContainText("Export saves a CSV. Import lets you add to or replace what's here.")
  await expect(page.getByRole('button', { name: /Add to my data|Replace my data/ })).toHaveCount(0)
})

test('Export downloads the data in the export format', async ({ page }) => {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export', exact: true }).click()])

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
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export', exact: true }).click()])
  const text = await readFile((await download.path())!, 'utf8')
  expect(text.split('\n')[2]).toBe('session,2026-01-01,Pull day,,Row,Back,strength,reps,132.28,10,,,lb,km')

  await pick(page, 'Import', 'gym_data_lb.csv', text)
  await expect(sheet(page).getByText('1 plan and 2 sessions found', { exact: true })).toBeVisible()
  await sheet(page).getByRole('button', { name: /Replace my data/ }).click()
  await expect(page.getByRole('heading', { name: 'Backup restored' })).toBeFocused()
  const sessions = await page.evaluate(() => JSON.parse(localStorage.getItem('gym:sessions')!))
  expect(sessions.map((s: { exercises: { sets: { weight: string }[] }[] }) => Number(s.exercises[0].sets[0].weight).toFixed(2))).toEqual(['60.00', '60.00'])
})

test('a chosen file opens the file-ready sheet over an unchanged card, and Add keeps existing data', async ({ page }) => {
  const before = await cardState(page)
  await pick(page, 'Import', 'gym_data_2026-02-01.csv', importCsv)

  await expect(sheet(page)).toHaveAccessibleName('Restore backup')
  await expect(page.getByRole('heading', { name: 'Restore backup' })).toBeFocused()
  await expect(sheet(page)).toContainText('Import · file ready')
  await expect(sheet(page).getByText('gym_data_2026-02-01.csv')).toBeVisible()
  await expect(sheet(page).getByText('1 plan and 2 sessions found. 1 row skipped: a column, field or unit was missing or unknown.')).toBeVisible()
  await expect(sheet(page).getByRole('button', { name: /Replace my data/ })).toContainText('Deletes the 1 plan and 2 sessions on this device first')
  expect(await cardState(page)).toEqual(before)

  await sheet(page).getByRole('button', { name: /Add to my data/ }).click()

  await expect(page.getByRole('heading', { name: 'Backup restored' })).toBeFocused()
  await expect(sheet(page)).toContainText('Imported')
  await expect(sheet(page).getByText('Added 1 plan and 1 session. 1 session already here was skipped.')).toBeVisible()
  await expect(card(page).locator('.dataCard__counts')).toHaveText('2 plans · 3 sessions')
  expect({ ...(await cardState(page)), text: before.text }).toEqual(before)
  const after = await stored(page)
  expect(after.plans.map((p) => p.name)).toEqual(['Pull day', 'Legs'])
  expect(after.sessions.map((s) => s.date)).toEqual(['2026-01-01', '2026-01-08', '2026-02-01'])

  await sheet(page).getByRole('button', { name: 'Done' }).click()
  await expect(sheet(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeFocused()

  await page.reload()
  await expect(card(page).locator('.dataCard__counts')).toHaveText('2 plans · 3 sessions')
})

test('Replace swaps the device data for the file', async ({ page }) => {
  await chooseFile(page, 'gym.csv', importCsv)
  await sheet(page).getByRole('button', { name: /Replace my data/ }).click()

  await expect(sheet(page).getByText('Replaced with 1 plan and 2 sessions.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Backup restored' })).toBeFocused()
  const after = await stored(page)
  expect(after.plans.map((p) => p.name)).toEqual(['Legs'])
  expect(after.sessions.map((s) => s.date)).toEqual(['2026-01-01', '2026-02-01'])
})

test('Cancel import, Escape and a tap outside close the sheet and change nothing', async ({ page }) => {
  const before = await stored(page)
  const importButton = page.getByRole('button', { name: 'Import', exact: true })

  await pick(page, 'Import', 'gym.csv', importCsv)
  await sheet(page).getByRole('button', { name: 'Cancel import' }).click()
  await expect(sheet(page)).toHaveCount(0)
  await expect(importButton).toBeFocused()

  await pick(page, 'Import', 'gym.csv', importCsv)
  await expect(page.getByRole('heading', { name: 'Restore backup' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(sheet(page)).toHaveCount(0)
  await expect(importButton).toBeFocused()

  await pick(page, 'Import', 'gym.csv', importCsv)
  await expect(sheet(page)).toBeVisible()
  await page.mouse.click(10, 10)
  await expect(sheet(page)).toHaveCount(0)

  expect(await stored(page)).toEqual(before)
})

test('a file that is not an export shows the error sheet and changes no data', async ({ page }) => {
  const before = await stored(page)
  await chooseFile(page, 'notes.csv', 'name,weight\nRow,60')

  await expect(page.getByRole('heading', { name: "Can't import this file" })).toBeFocused()
  await expect(sheet(page).getByText('notes.csv')).toBeVisible()
  await expect(sheet(page).getByText('The first line does not match a GymOS export, so nothing was read.')).toBeVisible()
  await expect(sheet(page).getByText('Nothing on this device was changed.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Add to my data|Replace my data/ })).toHaveCount(0)
  expect(await stored(page)).toEqual(before)

  await pick(page, 'Choose another file', 'empty.csv', `${HEADER}\nplan,,Legs`)
  await expect(page.getByRole('heading', { name: "Can't import this file" })).toBeFocused()
  await expect(sheet(page).getByText('No plans or sessions found: 1 row skipped because a column, field or unit was missing or unknown.')).toBeVisible()

  await pick(page, 'Choose another file', 'gym.csv', importCsv)
  await expect(page.getByRole('heading', { name: 'Restore backup' })).toBeFocused()
  expect(await stored(page)).toEqual(before)
})

test('after an import, See stats switches to the Stats tab', async ({ page }) => {
  await chooseFile(page, 'gym.csv', importCsv)
  await sheet(page).getByRole('button', { name: /Add to my data/ }).click()
  await sheet(page).getByRole('button', { name: 'See stats' }).click()

  await expect(sheet(page)).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Settings' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Stats', exact: true })).toHaveAttribute('aria-current', 'page')
})

test('the Settings tab and each import sheet have no detectable WCAG A/AA violations', async ({ page }) => {
  const scan = async () =>
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations.map(
      (v) => `${v.id} (${v.nodes.length})`,
    )
  expect(await scan()).toEqual([])
  await chooseFile(page, 'gym.csv', importCsv)
  await expect(sheet(page).getByRole('button', { name: /Add to my data/ })).toBeVisible()
  expect(await scan()).toEqual([])
  await sheet(page).getByRole('button', { name: /Add to my data/ }).click()
  await expect(sheet(page).getByRole('button', { name: 'See stats' })).toBeVisible()
  expect(await scan()).toEqual([])
  await chooseFile(page, 'notes.csv', 'name,weight\nRow,60')
  await expect(page.getByRole('heading', { name: "Can't import this file" })).toBeVisible()
  expect(await scan()).toEqual([])
})

const deleteLink = (page: Page) => page.getByRole('button', { name: 'Delete all data' })
const confirm = (page: Page) => page.getByRole('alertdialog')

test('Keep it, Escape and a tap outside leave the data and return focus to Delete all data', async ({ page }) => {
  const before = await stored(page)

  await deleteLink(page).click()
  await expect(confirm(page)).toHaveAccessibleName('Delete all data?')
  await expect(confirm(page)).toContainText('Delete for good')
  await expect(confirm(page)).toContainText("1 plan and 2 sessions are removed from this device and can't be restored. Your accent and units stay.")
  await expect(confirm(page).getByRole('button', { name: 'Keep it' })).toBeFocused()
  await confirm(page).getByRole('button', { name: 'Keep it' }).click()
  await expect(confirm(page)).toHaveCount(0)
  await expect(deleteLink(page)).toBeFocused()

  await deleteLink(page).click()
  await page.keyboard.press('Escape')
  await expect(confirm(page)).toHaveCount(0)
  await expect(deleteLink(page)).toBeFocused()

  await deleteLink(page).click()
  await page.mouse.click(10, 10)
  await expect(confirm(page)).toHaveCount(0)
  await expect(deleteLink(page)).toBeFocused()

  expect(await stored(page)).toEqual(before)
})

test('Export a backup first downloads the CSV and keeps the sheet open', async ({ page }) => {
  await deleteLink(page).click()
  const [download] = await Promise.all([page.waitForEvent('download'), confirm(page).getByRole('button', { name: 'Export a backup first' }).click()])
  expect(download.suggestedFilename()).toMatch(/^gym_data_\d{4}-\d{2}-\d{2}\.csv$/)
  await expect(confirm(page)).toBeVisible()
})

test('Delete everything empties plans and sessions and keeps accent and units', async ({ page }) => {
  await page.getByRole('group', { name: 'Accent colour' }).getByRole('button', { name: 'Amber' }).click()
  await page.getByRole('group', { name: 'Weight unit' }).getByRole('button', { name: 'lb', exact: true }).click()
  const prefsBefore = await page.evaluate(() => ({ accent: localStorage.getItem('gym:accent'), units: localStorage.getItem('gym:unitPrefs') }))

  await deleteLink(page).click()
  await confirm(page).getByRole('button', { name: 'Delete everything' }).click()

  await expect(confirm(page)).toHaveCount(0)
  await expect(card(page).locator('.dataCard__counts')).toHaveText('0 plans · 0 sessions')
  await expect(deleteLink(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeFocused()
  expect(await stored(page)).toEqual({ plans: [], sessions: [] })
  expect(await page.evaluate(() => ({ accent: localStorage.getItem('gym:accent'), units: localStorage.getItem('gym:unitPrefs') }))).toEqual(prefsBefore)
  await expect(page.getByRole('group', { name: 'Accent colour' }).getByRole('button', { name: 'Amber' })).toHaveAttribute('aria-pressed', 'true')

  await page.reload()
  await expect(card(page).locator('.dataCard__counts')).toHaveText('0 plans · 0 sessions')
  await page.getByRole('button', { name: 'Plans', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Have a CSV backup? Import it' })).toBeVisible()
})

test('the delete-all sheet has no detectable WCAG A/AA violations', async ({ page }) => {
  await deleteLink(page).click()
  await expect(confirm(page)).toBeVisible()
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
})
