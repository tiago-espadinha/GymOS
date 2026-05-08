import { expect, test, type Page } from '@playwright/test'

const openForm = async (page: Page) => {
  await page.goto('/')
  await page.getByRole('button', { name: '+ New plan' }).click()
}

const storedPlans = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('gym:plans') ?? '[]'))

test('a plan with a strength, a calisthenics and a cardio exercise is saved and survives a reload', async ({ page }) => {
  await openForm(page)
  await page.getByLabel('Plan name').fill('Full body')
  await page.getByLabel('Description (optional)').fill('Three exercises')

  await page.getByLabel('Exercise 1 name').fill('Bench press')
  await page.getByLabel('Exercise 1 muscle group').selectOption('Chest')

  await page.getByRole('button', { name: '+ Add exercise' }).click()
  await page.getByLabel('Exercise 2 name').fill('Plank')
  await page.getByRole('group', { name: 'Exercise 2 category' }).getByRole('button', { name: 'Calisthenics' }).click()
  await page.getByRole('group', { name: 'Exercise 2 tracking' }).getByRole('button', { name: 'Time' }).click()
  await page.getByRole('group', { name: 'Exercise 2 better set' }).getByRole('button', { name: 'Shorter is better' }).click()

  await page.getByRole('button', { name: '+ Add exercise' }).click()
  await page.getByLabel('Exercise 3 name').fill('Run')
  await page.getByRole('group', { name: 'Exercise 3 category' }).getByRole('button', { name: 'Cardio' }).click()
  await page.getByRole('group', { name: 'Exercise 3 distance unit' }).getByRole('button', { name: 'mi' }).click()

  await page.getByRole('button', { name: 'Save plan' }).click()
  await expect(page.getByRole('button', { name: 'Start Full body' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: 'Start Full body' })).toBeVisible()

  const [plan] = await storedPlans(page)
  expect(plan).toMatchObject({ name: 'Full body', desc: 'Three exercises' })
  expect(plan.exercises).toMatchObject([
    { name: 'Bench press', muscleGroup: 'Chest', category: 'strength' },
    { name: 'Plank', category: 'calisthenics', trackingType: 'time', timeGoal: 'shorter' },
    { name: 'Run', muscleGroup: 'Cardio', category: 'cardio', trackingType: 'time', trackDistance: true, distanceUnit: 'mi' },
  ])
})

test('calisthenics reps can track added weight', async ({ page }) => {
  await openForm(page)
  await page.getByRole('group', { name: 'Exercise 1 category' }).getByRole('button', { name: 'Calisthenics' }).click()
  await page.getByLabel('Track added weight').check()
  await page.getByLabel('Plan name').fill('Dips')
  await page.getByLabel('Exercise 1 name').fill('Dips')
  await page.getByRole('button', { name: 'Save plan' }).click()
  await expect(page.getByRole('button', { name: 'Start Dips' })).toBeVisible()
  const [plan] = await storedPlans(page)
  expect(plan.exercises[0]).toMatchObject({ category: 'calisthenics', trackingType: 'reps', trackWeight: true })
})

test('saving without a name or with an unnamed exercise stores nothing', async ({ page }) => {
  await openForm(page)
  await page.getByRole('button', { name: 'Save plan' }).click()
  await expect(page.getByText('Give the plan a name')).toBeVisible()
  expect(await storedPlans(page)).toEqual([])

  await page.getByLabel('Plan name').fill('Push day')
  await page.getByRole('button', { name: 'Save plan' }).click()
  await expect(page.getByText('Give the plan a name')).toHaveCount(0)
  expect(await storedPlans(page)).toEqual([])
})

test('a failed save with no name moves focus to the name field', async ({ page }) => {
  await openForm(page)
  await page.getByRole('button', { name: 'Save plan' }).click()
  await expect(page.getByLabel('Plan name')).toBeFocused()
})

test('choosing the category that is already selected keeps the tracking choices', async ({ page }) => {
  await openForm(page)
  const category = page.getByRole('group', { name: 'Exercise 1 category' })
  await category.getByRole('button', { name: 'Cardio' }).click()
  await page.getByLabel('Track distance').uncheck()
  await page.getByRole('group', { name: 'Exercise 1 better set' }).getByRole('button', { name: 'Shorter is better' }).click()
  await category.getByRole('button', { name: 'Cardio' }).click()
  await expect(page.getByLabel('Track distance')).not.toBeChecked()
  await expect(
    page.getByRole('group', { name: 'Exercise 1 better set' }).getByRole('button', { name: 'Shorter is better' }),
  ).toHaveAttribute('aria-pressed', 'true')
})

test('Cancel closes the form without saving', async ({ page }) => {
  await openForm(page)
  await page.getByLabel('Plan name').fill('Nope')
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByLabel('Plan name')).toHaveCount(0)
  expect(await storedPlans(page)).toEqual([])
})

test('a removed exercise is not saved', async ({ page }) => {
  await openForm(page)
  await page.getByLabel('Plan name').fill('Pull day')
  await page.getByLabel('Exercise 1 name').fill('Row')
  await page.getByRole('button', { name: '+ Add exercise' }).click()
  await page.getByLabel('Exercise 2 name').fill('Curl')
  await page.getByRole('button', { name: 'Remove exercise 1' }).click()
  await page.getByRole('button', { name: 'Save plan' }).click()
  const [plan] = await storedPlans(page)
  expect(plan.exercises.map((e: { name: string }) => e.name)).toEqual(['Curl'])
})

for (const width of [375, 768, 1280]) {
  test(`the form does not overflow at ${width}px, and every control is at least 44px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await openForm(page)
    await page.getByLabel('Plan name').fill('P'.repeat(60))
    await page.getByLabel('Exercise 1 name').fill('E'.repeat(60))
    await page.getByRole('button', { name: '+ Add exercise' }).click()
    await page.getByRole('group', { name: 'Exercise 2 category' }).getByRole('button', { name: 'Cardio' }).click()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    const small = await page.locator('form button, form select, form input:not([type="checkbox"])').evaluateAll((els) =>
      els
        .map((el) => ({ el, box: el.getBoundingClientRect() }))
        .filter(({ box }) => box.width < 44 || box.height < 44)
        .map(({ el }) => el.outerHTML.slice(0, 80)),
    )
    expect(small).toEqual([])
  })
}
