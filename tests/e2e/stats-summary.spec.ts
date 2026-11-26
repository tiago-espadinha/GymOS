import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// The Stats summary keeps its sentences whole and marks each count or value in the accent, bold.
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)

const plan = {
  id: 'p1',
  name: 'Pull day',
  desc: '',
  exercises: [
    { id: 'e1', name: 'Lat pulldown', muscleGroup: 'Back' },
    { id: 'e2', name: 'Row', muscleGroup: 'Back' },
    { id: 'e3', name: 'Seated row', muscleGroup: 'Back' },
  ],
}

const session = (ago: number, name: string, weight: string) => ({
  id: `${name}-${ago}`,
  planId: 'p1',
  planName: 'Pull day',
  date: daysAgo(ago),
  notes: '',
  exercises: [{ id: 'x', name, muscleGroup: 'Back', sets: [{ id: 's', weight, reps: '10', completed: true }] }],
})

const sessions = [
  session(40, 'Lat pulldown', '50'),
  session(30, 'Lat pulldown', '50'),
  session(20, 'Lat pulldown', '50'),
  session(10, 'Lat pulldown', '60'),
  session(20, 'Row', '60'),
  session(10, 'Row', '60'),
  session(20, 'Seated row', '65'),
  session(10, 'Seated row', '60'),
]

const accents = {
  lime: 'rgb(198, 255, 61)',
  amber: 'rgb(255, 178, 26)',
  cyan: 'rgb(61, 224, 255)',
  violet: 'rgb(185, 140, 255)',
  red: 'rgb(255, 64, 64)',
}
const WHITE = 'rgb(255, 255, 255)'

const open = async (page: Page, accent: string) => {
  await page.addInitScript(
    ([p, s, a]) => {
      localStorage.setItem('gym:plans', JSON.stringify([p]))
      localStorage.setItem('gym:sessions', JSON.stringify(s))
      localStorage.setItem('gym:accent', JSON.stringify(a))
    },
    [plan, sessions, accent] as const,
  )
  await page.goto('/')
  await page.getByText('Stats', { exact: true }).first().click()
}
const lines = (page: Page) => page.locator('.progressAnalysis p')
const highlights = (page: Page) => page.locator('.progressAnalysis .progressAnalysisFigure')
const pick = async (page: Page, name: string) => {
  await page.getByRole('button', { name: /^Exercise: / }).click()
  await page.getByRole('dialog').getByRole('searchbox', { name: 'Search exercises' }).fill(name)
  await page.getByRole('option', { name: new RegExp(`^${name}`, 'i') }).first().click()
}

test('each figure is highlighted while the sentences read unchanged', async ({ page }) => {
  await open(page, 'lime')
  await expect(lines(page)).toHaveText([
    'Lat pulldown tracked across 4 sessions.',
    '1 personal record achieved.',
    '1 stagnation point detected.',
    'Overall gain: 10.0 kg/rep.',
  ])
  await expect(highlights(page)).toHaveText(['4 sessions', '1 personal record', '1 stagnation point', '10.0 kg/rep'])
  // The rest of the sentence keeps the default text colour and weight.
  await expect(lines(page).first()).toHaveCSS('color', WHITE)
  await expect(lines(page).first()).toHaveCSS('font-weight', '500')

  await pick(page, 'Seated row')
  await expect(lines(page)).toHaveText(['Seated row tracked across 2 sessions.', 'Overall decline of 5.0 kg/rep from first session.'])
  await expect(highlights(page)).toHaveText(['2 sessions', '5.0 kg/rep'])

  // A line without a figure has nothing to highlight.
  await pick(page, 'Row')
  await expect(lines(page)).toHaveText(['Row tracked across 2 sessions.', 'Performance has remained stable.'])
  await expect(highlights(page)).toHaveText(['2 sessions'])
})

for (const [accent, colour] of Object.entries(accents)) {
  test(`figures use the ${accent} accent, bold, and pass axe`, async ({ page }) => {
    await open(page, accent)
    await expect(highlights(page)).toHaveCount(4)
    for (const figure of await highlights(page).all()) {
      await expect(figure).toHaveCSS('color', colour)
      await expect(figure).toHaveCSS('font-weight', '700')
    }
    const { violations } = await new AxeBuilder({ page })
      .include('.progressAnalysis')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
  })
}
