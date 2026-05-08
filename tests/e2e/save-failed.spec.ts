import { readFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { importFromCSV } from '../../src/utils/csv'

const plan = {
  id: 'p1',
  name: 'Push day',
  desc: '',
  exercises: [{ id: 'e1', name: 'Bench press', muscleGroup: 'Chest' }],
}

// The browser refuses writes to plans and sessions, as with a full quota or
// blocked storage, until refuseSaves(page, false). Other keys still write.
test.beforeEach(async ({ page }) => {
  await page.addInitScript((p) => {
    if (!localStorage.getItem('gym:plans')) localStorage.setItem('gym:plans', JSON.stringify([p]))
    const setItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (key: string, value: string) {
      const refused = sessionStorage.getItem('refuseSaves') === 'on' && (key === 'gym:plans' || key === 'gym:sessions')
      if (refused) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
      return setItem.call(this, key, value)
    }
  }, plan)
})

const refuseSaves = (page: Page, on = true) =>
  page.evaluate((v) => sessionStorage.setItem('refuseSaves', v ? 'on' : 'off'), on)

const stored = (page: Page, key: string) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '[]'), key)

const axe = async (page: Page) => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
}

async function finishWithASet(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Push day' }).click()
  await page.getByRole('button', { name: /^Bench press/ }).click()
  const inputs = page.locator('input[placeholder="0"]:visible')
  await inputs.nth(0).fill('60')
  await inputs.nth(1).fill('8')
  await page.getByRole('button', { name: 'All exercises' }).click()
  await page.getByRole('button', { name: 'Finish session' }).click()
  await page.getByLabel('Notes · optional').fill('Felt strong')
}

async function failNewPlan(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: '+ New plan' }).click()
  await page.getByLabel('Name', { exact: true }).fill('Pull day')
  await page.getByLabel('Exercise 1 name').fill('Row')
  await refuseSaves(page)
  await page.getByRole('button', { name: 'Save plan' }).click()
}

test.describe('Finish', () => {
  test('a refused save keeps the Done screen and notes, and Try again saves once storage works', async ({ page }) => {
    await finishWithASet(page)
    await refuseSaves(page)
    await page.getByRole('button', { name: 'Save session' }).click()

    const alert = page.getByRole('alert')
    await expect(alert).toContainText('Not saved')
    await expect(alert).toContainText('storage is full or blocked')
    await expect(page.getByRole('heading', { name: 'Done' })).toBeVisible()
    await expect(page.getByLabel('Notes · optional')).toHaveValue('Felt strong')
    await expect(page.locator('.finishRow')).toContainText('1 × 60 kg × 8')
    await expect(page.getByText('Session saved')).toHaveCount(0)
    expect(await stored(page, 'gym:sessions')).toEqual([])

    // Still refused: the alert stays and nothing is stored.
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(alert).toBeVisible()
    expect(await stored(page, 'gym:sessions')).toEqual([])

    await refuseSaves(page, false)
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.getByRole('heading', { name: 'Log', exact: true })).toBeVisible()
    await expect(page.getByText('Session saved')).toBeVisible()
    await page.reload()
    await expect(page.locator('.logHomeNotes').first()).toHaveText('Felt strong')
    const [session] = await stored(page, 'gym:sessions')
    expect(session).toMatchObject({ planName: 'Push day', notes: 'Felt strong' })
  })

  test('the unsaved session downloads as a CSV that Import reads back', async ({ page }) => {
    await finishWithASet(page)
    await refuseSaves(page)
    await page.getByRole('button', { name: 'Save session' }).click()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download this session (CSV)' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^gymos_session_\d{4}-\d{2}-\d{2}\.csv$/)
    const csv = await readFile(await download.path(), 'utf8')
    const { sessions } = importFromCSV(csv)
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({ planName: 'Push day', notes: 'Felt strong' })
    expect(sessions[0].exercises[0]).toMatchObject({ name: 'Bench press', sets: [{ weight: '60', reps: '8' }] })
  })

  test('the save-failed Done screen passes axe and fits 375, 768 and 1280', async ({ page }) => {
    await finishWithASet(page)
    await refuseSaves(page)
    await page.getByRole('button', { name: 'Save session' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await axe(page)
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `horizontal overflow at ${width}`).toBe(0)
      const download = await page.getByRole('button', { name: 'Download this session (CSV)' }).boundingBox()
      expect(download!.height).toBeGreaterThanOrEqual(44)
    }
  })
})

test.describe('New plan', () => {
  test('a refused save keeps the form and its values, and Try again saves once storage works', async ({ page }) => {
    await failNewPlan(page)

    await expect(page.getByRole('alert')).toContainText('Not saved')
    await expect(page.getByRole('heading', { name: 'New plan' })).toBeVisible()
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Pull day')
    expect((await stored(page, 'gym:plans')).map((p: { name: string }) => p.name)).toEqual(['Push day'])

    await refuseSaves(page, false)
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.getByRole('button', { name: 'Start Pull day' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Start Pull day' })).toBeVisible()
  })

  test('the save-failed form passes axe and fits 375, 768 and 1280', async ({ page }) => {
    await failNewPlan(page)
    await expect(page.getByRole('alert')).toBeVisible()
    await axe(page)
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `horizontal overflow at ${width}`).toBe(0)
    }
  })
})
