import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// A saved session opened with Edit is for correcting it: typed set rows, Add set and
// remove, and no timer of any kind.
const exercises = [
  { id: 'e1', name: 'Bench press', muscleGroup: 'Chest' },
  { id: 'e2', name: 'Plank', muscleGroup: 'Core', category: 'calisthenics', trackingType: 'time' },
  { id: 'e3', name: 'Rowing', muscleGroup: 'Cardio', category: 'cardio', trackingType: 'time', trackDistance: true, distanceUnit: 'km' },
]
const plan = { id: 'p1', name: 'Push day', desc: '', exercises }
const session = {
  id: 's1', planId: 'p1', planName: 'Push day', date: '2026-11-10', notes: '',
  exercises: [
    { ...exercises[0], sets: [{ id: 'b1', weight: '60.123', reps: '8' }, { id: 'b2', weight: '60', reps: '7' }] },
    { ...exercises[1], sets: [{ id: 'k1', weight: '', reps: '', duration: '45', restTaken: '60' }] },
    { ...exercises[2], sets: [{ id: 'r1', weight: '', reps: '', duration: '1200', distance: '4.2' }] },
  ],
}

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const field = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true })
const rows = (page: Page) => page.getByRole('list', { name: 'Sets' }).getByRole('listitem')
const timerKeys = (page: Page) => page.evaluate(() => Object.keys(localStorage).filter((k) => /-(rest|work)$/.test(k)))
const openExercise = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(`^${name}`) }).first().click()
const back = (page: Page) => button(page, 'All exercises').click()

const noTimers = async (page: Page) => {
  await expect(page.getByRole('timer')).toHaveCount(0)
  await expect(page.locator('.timerBlock')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^(Set done|Start (hold|effort)|Rest)/ })).toHaveCount(0)
  await expect(page.getByRole('switch')).toHaveCount(0)
  expect(await timerKeys(page)).toEqual([])
}

const axe = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
}

const saved = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('gym:sessions')!)[0].exercises as { name: string; sets: Record<string, string>[] }[])

const save = async (page: Page) => {
  await button(page, 'Finish session').click()
  await button(page, 'Save changes').click()
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(([p, s]) => {
    if (localStorage.getItem('gym:plans')) return
    localStorage.setItem('gym:plans', JSON.stringify([p]))
    localStorage.setItem('gym:sessions', JSON.stringify([s]))
    localStorage.setItem('gym:tab', JSON.stringify('log'))
  }, [plan, session] as const)
  await page.goto('/')
  await page.getByRole('button', { name: /^Edit Push day/ }).click()
})

for (const viewport of [{ width: 375, height: 812 }, { width: 1280, height: 800 }]) {
  test.describe(`${viewport.width} wide`, () => {
    test.use({ viewport, ...(viewport.width >= 1024 ? { isMobile: false, hasTouch: false } : {}) })

    test('strength, hold and cardio open as typed set rows with no timer, also after a reload', async ({ page }) => {
      await noTimers(page)
      await openExercise(page, 'Bench press')
      await expect(page.getByText('2 sets', { exact: true })).toBeVisible()
      await expect(field(page, 'Set 1 weight, kg')).toHaveValue('60.1')
      await expect(field(page, 'Set 2 reps')).toHaveValue('7')
      await noTimers(page)
      await axe(page)

      await back(page)
      await openExercise(page, 'Plank')
      await expect(field(page, 'Set 1 time')).toHaveValue('00:45')
      await noTimers(page)

      await back(page)
      await openExercise(page, 'Rowing')
      await expect(field(page, 'Set 1 time')).toHaveValue('20:00')
      await expect(field(page, 'Set 1 distance, km')).toHaveValue('4.2')
      await noTimers(page)
      await axe(page)

      await page.reload()
      await openExercise(page, 'Rowing')
      await expect(field(page, 'Set 1 time')).toHaveValue('20:00')
      await noTimers(page)

      // No timer half: the screen keeps the 600 column.
      const width = (await page.getByRole('list', { name: 'Sets' }).filter({ visible: true }).boundingBox())!.width
      expect(width).toBeLessThanOrEqual(600)
      expect(width).toBeGreaterThan(300)
    })

    test('typed values are saved; untouched ones and the rest taken are kept', async ({ page }) => {
      await openExercise(page, 'Bench press')
      await field(page, 'Set 2 weight, kg').fill('62.')
      await field(page, 'Set 2 weight, kg').press('End')
      await field(page, 'Set 2 weight, kg').pressSequentially('5')
      await button(page, 'Add set').click()
      await expect(field(page, 'Set 3 weight, kg')).toHaveValue('62.5')
      await field(page, 'Set 3 reps').fill('5')

      await back(page)
      await openExercise(page, 'Plank')
      await button(page, 'Add set').click()
      const time = field(page, 'Set 2 time')
      await time.focus()
      await time.pressSequentially('130')
      await expect(time).toHaveValue('01:30')

      await back(page)
      await openExercise(page, 'Rowing')
      await field(page, 'Set 1 time').fill('2130')
      await field(page, 'Set 1 distance, km').fill('4,5')
      await back(page)
      await save(page)

      const [bench, plank, rowing] = await saved(page)
      expect(bench.sets.map((s) => [s.weight, s.reps])).toEqual([['60.123', '8'], ['62.5', '7'], ['62.5', '5']])
      expect(plank.sets.map((s) => [s.duration, s.restTaken])).toEqual([['45', '60'], ['90', undefined]])
      expect(rowing.sets.map((s) => [s.duration, s.distance])).toEqual([['1290', '4.5']])
      expect(await timerKeys(page)).toEqual([])
    })

    // Safari puts the caret where the tap landed, which would send the digits mid-time.
    test('typing after a tap on a filled field replaces it, wherever the tap landed', async ({ page, hasTouch }) => {
      await openExercise(page, 'Plank')
      const time = field(page, 'Set 1 time')
      const box = (await time.boundingBox())!
      for (const x of [0.1, 0.9, 0.5]) {
        const position = { x: box.width * x, y: box.height / 2 }
        await (hasTouch ? time.tap({ position }) : time.click({ position }))
        await page.keyboard.type('130')
        await expect(time).toHaveValue('01:30')
      }
    })

    test('sets are removed; an added row left empty is not saved', async ({ page }) => {
      await openExercise(page, 'Bench press')
      await button(page, 'Remove set 1').click()
      await expect(rows(page)).toHaveCount(1)
      await expect(button(page, 'Remove set 1')).toBeFocused()
      await expect(field(page, 'Set 1 reps')).toHaveValue('7')

      await back(page)
      await openExercise(page, 'Plank')
      await button(page, 'Remove set 1').click()
      await expect(page.getByText(/^No sets\./)).toBeVisible()
      await expect(button(page, 'Add set')).toBeFocused()
      await axe(page)
      await button(page, 'Add set').click()
      await expect(field(page, 'Set 1 time')).toHaveValue('')
      await back(page)
      await save(page)

      const stored = await saved(page)
      expect(stored.map((e) => e.name)).toEqual(['Bench press', 'Rowing'])
      expect(stored[0].sets).toEqual([{ id: 'b2', weight: '60', reps: '7' }])
    })
  })
}
