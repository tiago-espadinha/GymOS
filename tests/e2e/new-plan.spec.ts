import { expect, test, type Page } from '@playwright/test'

const openForm = async (page: Page) => {
  await page.goto('/')
  await page.getByRole('button', { name: '+ New plan' }).click()
}

const storedPlans = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('gym:plans') ?? '[]'))

const planName = (page: Page) => page.getByLabel('Name', { exact: true })
const group = (page: Page, name: string) => page.getByRole('group', { name, exact: true })
const choose = (page: Page, groupName: string, option: string) =>
  group(page, groupName).getByRole('button', { name: option, exact: true }).click()
const addExercise = (page: Page) => page.getByRole('button', { name: '+ Add exercise' }).click()
const header = (page: Page, name: RegExp) => page.getByRole('button', { name, expanded: false })

async function pickMuscle(page: Page, muscle: string) {
  await page.getByRole('button', { name: /^Muscle group/ }).click()
  await page.getByRole('listbox', { name: 'Muscle group' }).getByRole('option', { name: muscle }).click()
}

test('a plan with a strength, a calisthenics and a cardio exercise is saved and survives a reload', async ({ page }) => {
  await openForm(page)
  await planName(page).fill('Full body')
  await page.getByLabel('Description · optional').fill('Three exercises')

  await page.getByLabel('Exercise 1 name').fill('Bench press')
  await pickMuscle(page, 'Triceps')

  await addExercise(page)
  await page.getByLabel('Exercise 2 name').fill('Plank')
  await choose(page, 'Category', 'Calisthenics')
  await choose(page, 'Measured in', 'Time')
  await choose(page, 'Better when the time is', 'Shorter')

  await addExercise(page)
  await page.getByLabel('Exercise 3 name').fill('Run')
  await choose(page, 'Category', 'Cardio')
  await choose(page, 'Distance unit', 'mi')

  await page.getByRole('button', { name: 'Save plan' }).click()
  await expect(page.getByRole('button', { name: 'Start Full body' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: 'Start Full body' })).toBeVisible()

  const [plan] = await storedPlans(page)
  expect(plan).toMatchObject({ name: 'Full body', desc: 'Three exercises' })
  expect(plan.exercises).toMatchObject([
    { name: 'Bench press', muscleGroup: 'Triceps', category: 'strength' },
    { name: 'Plank', category: 'calisthenics', trackingType: 'time', timeGoal: 'shorter' },
    { name: 'Run', muscleGroup: 'Cardio', category: 'cardio', trackingType: 'time', trackDistance: true, distanceUnit: 'mi' },
  ])
})

test('weight is a switch: on for strength, off for calisthenics until turned on', async ({ page }) => {
  await openForm(page)
  const trackWeight = page.getByRole('switch', { name: /^Track weight/ })
  await expect(trackWeight).toHaveAttribute('aria-checked', 'true')
  await choose(page, 'Category', 'Calisthenics')
  await expect(trackWeight).toHaveAttribute('aria-checked', 'false')
  await trackWeight.click()
  await expect(trackWeight).toHaveAttribute('aria-checked', 'true')

  await planName(page).fill('Dips')
  await page.getByLabel('Exercise 1 name').fill('Dips')
  await page.getByRole('button', { name: 'Save plan' }).click()
  const [plan] = await storedPlans(page)
  expect(plan.exercises[0]).toMatchObject({ category: 'calisthenics', trackingType: 'reps', trackWeight: true })
})

test('errors are flagged inline, summarised over Save, and focus goes to the first one', async ({ page }) => {
  await openForm(page)
  const save = page.getByRole('button', { name: 'Save plan' })
  await save.click()
  await expect(page.getByText('Give the plan a name')).toBeVisible()
  await expect(page.getByText('Name this exercise or remove it')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveText('2 things to fix before saving')
  await expect(planName(page)).toBeFocused()
  await expect(planName(page)).toHaveAttribute('aria-invalid', 'true')
  await save.click()
  await expect(planName(page)).toBeFocused()

  await planName(page).fill('Push day')
  await expect(page.getByRole('alert')).toHaveText('1 thing to fix before saving')
  await addExercise(page)
  await page.getByLabel('Exercise 2 name').fill('Dips')
  await save.click()
  await expect(page.getByLabel('Exercise 1 name')).toBeFocused()
  await save.click()
  await expect(page.getByLabel('Exercise 1 name')).toBeFocused()
  await expect(page.getByLabel('Exercise 1 name')).toHaveAttribute('aria-invalid', 'true')
  expect(await storedPlans(page)).toEqual([])

  await page.getByLabel('Exercise 1 name').fill('Push-up')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await save.click()
  const [plan] = await storedPlans(page)
  expect(plan.exercises.map((e: { name: string }) => e.name)).toEqual(['Push-up', 'Dips'])
})

test('Add exercise collapses the open one and focuses the new name field', async ({ page }) => {
  await openForm(page)
  await page.getByLabel('Exercise 1 name').fill('Squat')
  await addExercise(page)
  await expect(page.getByLabel('Exercise 2 name')).toBeFocused()
  await expect(page.getByLabel('Exercise 1 name')).toHaveCount(0)
  await expect(header(page, /^Squat/)).toContainText('Strength · Chest · weight × reps')
  await header(page, /^Squat/).click()
  await expect(page.getByLabel('Exercise 1 name')).toBeFocused()
})

test('Remove offers Undo, which puts the exercise back where it was', async ({ page }) => {
  await openForm(page)
  await page.getByLabel('Exercise 1 name').fill('Row')
  await addExercise(page)
  await page.getByLabel('Exercise 2 name').fill('Curl')
  await addExercise(page)
  await page.getByLabel('Exercise 3 name').fill('Shrug')
  await header(page, /^Curl/).click()

  await page.getByRole('button', { name: 'Remove exercise 2' }).click()
  await expect(header(page, /^Row/)).toBeFocused()
  const toast = page.getByRole('status').filter({ hasText: 'Exercise 2 removed' })
  await expect(toast).toBeVisible()

  await toast.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByLabel('Exercise 2 name')).toHaveValue('Curl')
  await expect(page.getByLabel('Exercise 2 name')).toBeFocused()
  await expect(toast).toHaveCount(0)
})

test('removing the first exercise focuses the next; removing the last focuses Add exercise', async ({ page }) => {
  await openForm(page)
  await page.getByLabel('Exercise 1 name').fill('Row')
  await addExercise(page)
  await page.getByLabel('Exercise 2 name').fill('Curl')
  await header(page, /^Row/).click()
  await page.getByRole('button', { name: 'Remove exercise 1' }).click()
  await expect(header(page, /^Curl/)).toBeFocused()

  await header(page, /^Curl/).click()
  await page.getByRole('button', { name: 'Remove exercise 1' }).click()
  await expect(page.getByRole('button', { name: '+ Add exercise' })).toBeFocused()

  await planName(page).fill('Empty')
  await page.getByRole('button', { name: 'Save plan' }).click()
  await expect(page.getByText('Add at least one exercise')).toBeVisible()
  expect(await storedPlans(page)).toEqual([])
})

test('a removed exercise is not saved', async ({ page }) => {
  await openForm(page)
  await planName(page).fill('Pull day')
  await page.getByLabel('Exercise 1 name').fill('Row')
  await addExercise(page)
  await page.getByLabel('Exercise 2 name').fill('Curl')
  await header(page, /^Row/).click()
  await page.getByRole('button', { name: 'Remove exercise 1' }).click()
  await page.getByRole('button', { name: 'Save plan' }).click()
  const [plan] = await storedPlans(page)
  expect(plan.exercises.map((e: { name: string }) => e.name)).toEqual(['Curl'])
})

test('muscle group opens a listbox sheet that works from the keyboard', async ({ page }) => {
  await openForm(page)
  const select = page.getByRole('button', { name: 'Muscle group Chest' })
  await expect(select).toHaveAttribute('aria-haspopup', 'listbox')
  await select.focus()
  await page.keyboard.press('Enter')
  const listbox = page.getByRole('listbox', { name: 'Muscle group' })
  await expect(listbox.getByRole('option', { name: 'Chest' })).toBeFocused()
  await expect(listbox.getByRole('option', { name: 'Chest' })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(listbox).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Muscle group Back' })).toBeFocused()

  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Muscle group Back' })).toBeFocused()
})

test('choosing the category that is already selected keeps the tracking choices', async ({ page }) => {
  await openForm(page)
  await choose(page, 'Category', 'Cardio')
  const distance = page.getByRole('switch', { name: /^Track distance/ })
  await distance.click()
  await expect(distance).toHaveAttribute('aria-checked', 'false')
  await choose(page, 'Better when the time is', 'Shorter')
  await choose(page, 'Category', 'Cardio')
  await expect(distance).toHaveAttribute('aria-checked', 'false')
  await expect(group(page, 'Better when the time is').getByRole('button', { name: 'Shorter' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('Cancel closes the form without saving', async ({ page }) => {
  await openForm(page)
  await planName(page).fill('Nope')
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(planName(page)).toHaveCount(0)
  expect(await storedPlans(page)).toEqual([])
})

test('Save stays on screen while a long form scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await openForm(page)
  for (let i = 0; i < 4; i++) await addExercise(page)
  await page.mouse.wheel(0, -2000)
  await expect(page.getByRole('button', { name: 'Save plan' })).toBeInViewport()
})

for (const width of [375, 768, 1280]) {
  test(`the form does not overflow at ${width}px, and every control is at least 44px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await openForm(page)
    await planName(page).fill('P'.repeat(60))
    await page.getByLabel('Exercise 1 name').fill('E'.repeat(60))
    await addExercise(page)
    await choose(page, 'Category', 'Cardio')
    await page.getByRole('button', { name: 'Save plan' }).click()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    const small = await page.locator('form button, form input').evaluateAll((els) =>
      els
        .map((el) => ({ el, box: el.getBoundingClientRect() }))
        .filter(({ box }) => box.width < 44 || box.height < 44)
        .map(({ el }) => el.outerHTML.slice(0, 80)),
    )
    expect(small).toEqual([])
  })
}
