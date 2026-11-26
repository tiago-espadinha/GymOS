import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// Numbered exercise lists show their numbers in the accent, in a session too,
// where the current row is inverted white and keeps a black number.
const plan = {
  id: 'p1',
  name: 'Push day',
  desc: '',
  exercises: [
    { id: 'e1', name: 'Bench press', muscleGroup: 'Chest' },
    { id: 'e2', name: 'Overhead press', muscleGroup: 'Shoulders' },
  ],
}

const accents = { lime: 'rgb(198, 255, 61)', red: 'rgb(255, 64, 64)' }
const BLACK = 'rgb(0, 0, 0)'
const DANGER = 'rgb(255, 138, 122)'

const open = async (page: Page, accent: string) => {
  await page.addInitScript(
    ([p, a]) => {
      localStorage.setItem('gym:plans', JSON.stringify([p]))
      localStorage.setItem('gym:accent', JSON.stringify(a))
    },
    [plan, accent] as const,
  )
  await page.goto('/')
}

const axe = async (page: Page) => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
}

for (const [accent, rgb] of Object.entries(accents)) {
  test.describe(accent, () => {
    test.describe('phone', () => {
      test.use({ viewport: { width: 375, height: 812 } })

      test('the plan overview numbers its exercises in the accent', async ({ page }) => {
        await open(page, accent)
        await page.getByRole('button', { name: /^Push day 2 exercises/ }).click()
        const screen = page.getByRole('region', { name: 'Push day' })
        const numbers = screen.locator('.planDetail__number')
        await expect(numbers).toHaveText(['1', '2'])
        await expect(numbers.first()).toHaveCSS('color', rgb)
        await expect(screen.getByRole('listitem')).toHaveText([/^1Bench press/, /^2Overhead press/])
        await expect(screen.locator('.planDetail__exerciseName').first()).toHaveCSS('color', 'rgb(255, 255, 255)')
        await axe(page)
      })

      test('the New plan form numbers open and collapsed exercises in the accent; an error stays red', async ({ page }) => {
        await open(page, accent)
        await page.getByRole('button', { name: '+ Create New' }).first().click()
        await page.getByLabel('Exercise 1 name').fill('Squat')
        await page.getByRole('button', { name: '+ Add exercise' }).click()
        const numbers = page.locator('.exerciseNumber')
        await expect(numbers).toHaveText(['1', '2'])
        await expect(numbers.nth(0)).toHaveCSS('color', rgb)
        await expect(numbers.nth(1)).toHaveCSS('color', rgb)
        await axe(page)

        // Exercise 2 is open and unnamed, so Save flags it; Squat stays valid and collapsed.
        await page.getByLabel('Name', { exact: true }).fill('Legs')
        await page.getByRole('button', { name: 'Save plan' }).click()
        await expect(page.getByLabel('Exercise 2 name')).toHaveAttribute('aria-invalid', 'true')
        await expect(numbers.nth(1)).toHaveCSS('color', DANGER)
        await expect(numbers.nth(0)).toHaveCSS('color', rgb)
      })

      test('inside a session the All exercises numbers are the accent, the current row black', async ({ page }) => {
        await open(page, accent)
        await page.getByRole('button', { name: 'Start Push day' }).click()
        const number = (name: RegExp) => page.getByRole('button', { name }).locator('.list-row__number')
        await expect(number(/^Overhead press/)).toHaveText('2')
        await expect(number(/^Overhead press/)).toHaveCSS('color', rgb)
        await expect(page.getByRole('button', { name: /^Bench press/ })).toHaveCSS('background-color', 'rgb(255, 255, 255)')
        await expect(number(/^Bench press/)).toHaveCSS('color', BLACK)
      })
    })

    test.describe('at 1280', () => {
      test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false })

      test('the wide plan pane numbers its exercises in the accent', async ({ page }) => {
        await open(page, accent)
        const numbers = page.locator('.planDetail__number')
        await expect(numbers).toHaveText(['1', '2'])
        await expect(numbers.last()).toHaveCSS('color', rgb)
        await axe(page)
      })
    })
  })
}
