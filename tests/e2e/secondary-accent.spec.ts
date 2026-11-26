import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// Board "Blackout · Secondary accent": pickers mark the chosen item with the accent (A),
// and the plan actions sheet opens on an accent block (C).
const plan = { id: 'p1', name: 'Back', desc: '', exercises: [{ id: 'e1', name: 'Lat pulldown', muscleGroup: 'Back' }] }
const session = {
  id: 's1',
  planId: 'p1',
  planName: 'Back',
  date: new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10),
  notes: '',
  exercises: [{ id: 'e1', name: 'Lat pulldown', muscleGroup: 'Back', sets: [{ id: 'a', weight: '50', reps: '10', completed: true }] }],
}
const BLACK = 'rgb(0, 0, 0)'
const accents = { lime: 'rgb(198, 255, 61)', red: 'rgb(255, 64, 64)' }

const open = async (page: Page, accent: string) => {
  await page.addInitScript(
    ([p, s, a]) => {
      if (localStorage.getItem('gym:plans')) return
      localStorage.setItem('gym:plans', JSON.stringify([p]))
      localStorage.setItem('gym:sessions', JSON.stringify([s]))
      localStorage.setItem('gym:accent', JSON.stringify(a))
    },
    [plan, session, accent] as const,
  )
  await page.goto('/')
}
const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true })
const axe = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
}

for (const [accent, fill] of Object.entries(accents)) {
  test.describe(`in ${accent}`, () => {
    test('Pick a plan fills the chosen plan with the accent and keeps its check', async ({ page }) => {
      await open(page, accent)
      await tab(page, 'Log').click()
      await page.getByRole('button', { name: /^Training plan: / }).click()
      const chosen = page.getByRole('dialog', { name: 'Pick a plan' }).getByRole('option', { selected: true })
      await expect(chosen).toHaveCSS('background-color', fill)
      await expect(chosen).toHaveCSS('color', BLACK)
      await expect(chosen.locator('svg')).toHaveCount(1)
      await axe(page)
    })

    test('Session date fills the chosen option and day with the accent', async ({ page }) => {
      await open(page, accent)
      await tab(page, 'Log').click()
      await page.getByRole('button', { name: /^Session date: / }).click()
      const sheet = page.getByRole('dialog', { name: 'Session date' })
      await expect(sheet.getByRole('button', { name: /^Today/, pressed: true })).toHaveCSS('background-color', fill)
      await expect(sheet.locator('[aria-selected="true"] > .calendar__day')).toHaveCSS('background-color', fill)
      await axe(page)
    })

    test('Pick an exercise fills the chosen exercise with the accent', async ({ page }) => {
      await open(page, accent)
      await tab(page, 'Stats').click()
      await page.getByRole('button', { name: /^Exercise: / }).click()
      const chosen = page.getByRole('dialog').getByRole('option', { selected: true })
      await expect(chosen).toHaveCSS('background-color', fill)
      await expect(chosen).toHaveCSS('color', BLACK)
      await axe(page)
    })

    test('plan actions open on an accent block with the plan name in black', async ({ page }) => {
      await open(page, accent)
      await tab(page, 'Plans').click()
      await page.getByRole('button', { name: 'More actions for Back' }).click()
      const sheet = page.getByRole('dialog', { name: 'Back' })
      await expect(sheet.locator('.planActions__head')).toHaveCSS('background-color', fill)
      await expect(sheet.getByRole('heading', { name: 'Back' })).toHaveCSS('color', BLACK)
      // The block reaches the sheet's edges.
      const [head, box] = await Promise.all([sheet.locator('.planActions__head').boundingBox(), sheet.boundingBox()])
      expect(head!.x).toBe(box!.x)
      expect(head!.width).toBe(box!.width)
      expect(head!.y).toBe(box!.y)
      await axe(page)
    })
  })
}

test.describe('at 1280', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false })

  test('the plan actions block spans the centred sheet edge to edge', async ({ page }) => {
    await open(page, 'lime')
    await page.getByRole('button', { name: 'More actions for Back' }).click()
    const sheet = page.getByRole('dialog', { name: 'Back' })
    const [head, box] = await Promise.all([sheet.locator('.planActions__head').boundingBox(), sheet.boundingBox()])
    expect(box!.width).toBeLessThan(1280)
    expect(head).toMatchObject({ x: box!.x, y: box!.y, width: box!.width })
  })
})
