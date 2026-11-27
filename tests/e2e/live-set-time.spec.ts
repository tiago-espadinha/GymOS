import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// Fixing a timed set mid-session: its time is the typed Time field, not a seconds stepper.
const exercises = [
  { id: 'e1', name: 'Plank', muscleGroup: 'Core', category: 'calisthenics', trackingType: 'time', sets: [
    { id: 'a', weight: '', reps: '', duration: '45', restTaken: '60' },
    { id: 'b', weight: '', reps: '', duration: '40.4', restTaken: '55' },
  ] },
  { id: 'e2', name: 'Rowing', muscleGroup: 'Cardio', category: 'cardio', trackingType: 'time', trackDistance: true, distanceUnit: 'km', sets: [
    { id: 'c', weight: '', reps: '', duration: '1200', distance: '4.2' },
  ] },
]
const active = { planId: 'p1', planName: 'Push day', date: '2026-11-15', notes: '', exercises }

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const time = (page: Page) => page.getByRole('textbox', { name: 'Time', exact: true })
const open = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(`^${name}`) }).first().click()
const durations = (page: Page) =>
  page.evaluate(() =>
    (JSON.parse(localStorage.getItem('gym:activeSession')!).exercises as { sets: { duration: string }[] }[]).map((e) =>
      e.sets.map((s) => s.duration),
    ),
  )

test.beforeEach(async ({ page }) => {
  await page.addInitScript((a) => {
    if (localStorage.getItem('gym:plans')) return
    localStorage.setItem('gym:plans', JSON.stringify([{ id: 'p1', name: 'Push day', desc: '', exercises: a.exercises }]))
    localStorage.setItem('gym:activeSession', JSON.stringify(a))
    localStorage.setItem('gym:tab', JSON.stringify('log'))
  }, active)
  await page.goto('/')
})

test('a hold shows its time as the row does, with no steppers, and saving untouched keeps it', async ({ page }) => {
  await open(page, 'Plank')
  await button(page, 'Edit set 2').click()
  await expect(time(page)).toHaveValue('00:40')
  await expect(time(page)).toBeFocused()
  await expect(page.getByRole('button', { name: /(Increase|Decrease) Time/ })).toHaveCount(0)
  await button(page, 'Save set 2').click()
  await expect.poll(async () => (await durations(page))[0]).toEqual(['45', '40.4'])
})

test('a tap selects the whole time so typing replaces it, and an empty time cannot be saved', async ({ page }) => {
  await open(page, 'Rowing')
  await button(page, 'Edit set 1').click()
  await expect(time(page)).toHaveValue('20:00')
  // The second tap lands on a field that is already focused.
  await time(page).click()
  await time(page).click()
  await page.keyboard.type('1830')
  await expect(time(page)).toHaveValue('18:30')
  await time(page).click()
  await page.keyboard.press('Backspace')
  await expect(time(page)).toHaveValue('')
  await expect(button(page, 'Save set 1')).toBeDisabled()
  await page.keyboard.type('90')
  await button(page, 'Save set 1').click()
  await expect.poll(async () => (await durations(page))[1]).toEqual(['90'])
})

test('a tap on the caption also selects the whole time', async ({ page }) => {
  await open(page, 'Rowing')
  await button(page, 'Edit set 1').click()
  await button(page, 'Save set 1').focus()
  await page.locator('.exerciseLoggerTimeUnit').click()
  await expect(time(page)).toBeFocused()
  await page.keyboard.type('1830')
  await expect(time(page)).toHaveValue('18:30')
  // And again with the field already focused.
  await page.locator('.exerciseLoggerTimeUnit').click()
  await page.keyboard.type('45')
  await expect(time(page)).toHaveValue('00:45')
})

test('moving to another set mid-edit shows that set’s time', async ({ page }) => {
  await open(page, 'Plank')
  await button(page, 'Edit set 1').click()
  await time(page).fill('130')
  await button(page, 'Edit set 2').click()
  await expect(time(page)).toHaveValue('00:40')
  await expect(time(page)).toBeFocused()
  await button(page, 'Save set 2').click()
  await expect.poll(async () => (await durations(page))[0]).toEqual(['45', '40.4'])
})

test('the edit panel with the Time field has no detectable WCAG A/AA violations', async ({ page }) => {
  await open(page, 'Rowing')
  await button(page, 'Edit set 1').click()
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
})
