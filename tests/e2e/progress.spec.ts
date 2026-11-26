import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)

const plan = {
  id: 'p1',
  name: 'Pull day',
  desc: '',
  exercises: [
    { id: 'e1', name: 'Lat pulldown', muscleGroup: 'Back' },
    { id: 'e2', name: 'Plank', muscleGroup: 'Core', category: 'calisthenics', trackingType: 'time' },
    { id: 'e3', name: 'Row', muscleGroup: 'Back' },
    { id: 'e4', name: 'Seated row', muscleGroup: 'Back' },
  ],
}

const session = (ago: number, name: string, weight: string, reps: string) => ({
  id: `${name}-${ago}`,
  planId: 'p1',
  planName: 'Pull day',
  date: daysAgo(ago),
  notes: '',
  exercises: [{ id: 'x', name, muscleGroup: 'Back', sets: [{ id: 's', weight, reps, completed: true }] }],
})

const sessions = [
  session(200, 'Lat pulldown', '50', '10'),
  session(150, 'Lat pulldown', '57', '8'),
  session(80, 'Lat pulldown', '30', '10'),
  session(60, 'Lat pulldown', '35', '10'),
  session(20, 'Lat pulldown', '30', '12'),
  session(5, 'Lat pulldown', '40', '12'),
  session(200, 'Row', '60', '10'),
  session(30, 'Seated row', '60', '10'),
  session(3, 'Seated row', '65', '10'),
]

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ([p, s]) => {
      localStorage.setItem('gym:plans', JSON.stringify([p]))
      localStorage.setItem('gym:sessions', JSON.stringify(s))
    },
    [plan, sessions] as const,
  )
  await page.goto('/')
  await page.getByText('Stats', { exact: true }).first().click()
})

const picker = (page: Page) => page.getByRole('button', { name: /^Exercise: / })
const pick = async (page: Page, name: string) => {
  await picker(page).click()
  await page.getByRole('dialog').getByRole('searchbox', { name: 'Search exercises' }).fill(name)
  await page.getByRole('option', { name: new RegExp(`^${name}`, 'i') }).first().click()
}
const metric = (page: Page, name: string) =>
  page.getByRole('group', { name: 'Metric' }).getByRole('button', { name, exact: true })
const rings = (page: Page) => page.locator('.progressChart circle[stroke="var(--color-accent)"]')
const figures = (page: Page) => page.locator('.progressStatValue')
const caption = (page: Page) => page.locator('.progressCaption')
const range = (page: Page, name: string) =>
  page.getByRole('group', { name: 'Time range' }).getByRole('button', { name, exact: true })

for (const width of [375, 768]) {
  test(`the Stats title is the same size as the Plans title at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    const titleSize = () => page.getByRole('heading', { level: 1 }).evaluate((el) => getComputedStyle(el).fontSize)
    await expect(page.getByRole('heading', { name: 'Stats', level: 1 })).toBeVisible()
    const progress = await titleSize()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    await page.getByRole('navigation', { name: 'Main' }).getByText('Plans').click()
    await expect(page.getByRole('heading', { name: '1 Plan', level: 1 })).toBeVisible()
    expect(progress).toBe(await titleSize())
  })
}

test('shows last and best for the chosen metric', async ({ page }) => {
  await expect(picker(page)).toHaveAccessibleName('Exercise: Lat pulldown. Change')
  await expect(figures(page)).toHaveText(['40.0kg/rep', '57.0kg/rep'])
  await page.getByRole('group', { name: 'Metric' }).getByRole('button', { name: 'Peak' }).click()
  await expect(figures(page)).toHaveText(['40kg × 12', '57kg × 8'])
  await expect(page.locator('.progressStatKicker').nth(0)).toContainText('Last ·')
  await expect(page.getByRole('group', { name: 'Metric' }).getByRole('button')).toHaveCount(4)
})

test('ranges narrow the chart and keep last and best', async ({ page }) => {
  await expect(caption(page)).toContainText('6 sessions')
  await expect(page.locator('.progressAnalysis p')).toHaveText([
    'Lat pulldown tracked across 6 sessions.',
    '1 personal record achieved.',
    'Overall decline of 10.0 kg/rep from first session.',
  ])
  await expect(page.locator('.progressChart circle[fill="var(--color-accent)"]')).toHaveCount(1)
  for (const [name, text] of [['5S', 'last 5 of 6'], ['10S', '6 sessions'], ['1M', 'last 2 of 6'], ['3M', 'last 4 of 6']]) {
    await range(page, name).click()
    await expect(range(page, name)).toHaveAttribute('aria-pressed', 'true')
    await expect(caption(page)).toContainText(text)
  }
  await expect(figures(page)).toHaveText(['40.0kg/rep', '57.0kg/rep'])
  await expect(page.locator('.progressAnalysis p')).toHaveText([
    'Lat pulldown tracked across 4 sessions.',
    'Overall gain: 10.0 kg/rep.',
  ])
})

test('ranges with no sessions are disabled and fall back to All', async ({ page }) => {
  await range(page, '1M').click()
  await pick(page, 'Row')
  await expect(range(page, '1M')).toBeDisabled()
  await expect(range(page, '3M')).toBeDisabled()
  await expect(range(page, 'All')).toHaveAttribute('aria-pressed', 'true')
  await expect(caption(page).locator('.progressCount')).toHaveText('1 session')
})

test('an exercise without sessions shows the board empty state and Go to Log opens Log', async ({ page }) => {
  await pick(page, 'Plank')
  await expect(page.getByRole('heading', { name: 'Nothing logged yet' })).toBeVisible()
  await expect(page.getByText('Plank is in 1 plan but has no saved sets.')).toBeVisible()
  await expect(page.locator('.progressChart')).toHaveCount(0)
  await expect(page.getByRole('group', { name: 'Metric' })).toHaveCount(0)
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
  await page.getByRole('button', { name: 'Go to Log' }).click()
  await expect(page.getByRole('button', { name: 'Log', exact: true })).toHaveAttribute('aria-current', 'page')
})

test('the exercise search filters by name, counts and shows each history', async ({ page }) => {
  await picker(page).click()
  const sheet = page.getByRole('dialog')
  const search = sheet.getByRole('searchbox', { name: 'Search exercises' })
  await expect(search).toBeFocused()
  await expect(sheet.getByText('4 exercises')).toBeVisible()
  await expect(sheet.getByRole('option', { name: /Lat pulldown/ })).toHaveAttribute('aria-selected', 'true')
  await expect(sheet.getByRole('option', { name: /Lat pulldown/ })).toContainText('6 sessions · last')
  await expect(sheet.getByRole('option', { name: /Plank/ })).toContainText('No sessions yet')

  await search.fill('ROW')
  await expect(sheet.getByRole('option')).toHaveText([/^Row/, /^Seated row/])
  await expect(sheet.getByText('2 of 4 exercises')).toBeVisible()
  await search.press('ArrowDown')
  await expect(sheet.getByRole('option', { name: /^Row/ })).toBeFocused()

  await search.fill('squat')
  await expect(sheet.getByText('No exercise matches “squat”.')).toBeVisible()
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])

  await page.keyboard.press('Escape')
  await expect(sheet).toHaveCount(0)
  await expect(picker(page)).toBeFocused()
  await expect(picker(page)).toHaveAccessibleName('Exercise: Lat pulldown. Change')
})

test('PRs get rings, and Best is kept when the latest session is not a PR', async ({ page }) => {
  // Average per rep: 50, 57, 30, 35, 30, 40; only 57 beats everything before it.
  await expect(rings(page)).toHaveCount(1)
  await expect(page.locator('.progressChartPR')).toHaveCount(0)
  await expect(page.locator('.progressLegend')).toHaveText('PR')
  await expect(page.locator('.progressChart')).toHaveAttribute('aria-label', /, 1 personal record$/)
  await expect(page.locator('.progressStatKicker').nth(1)).toContainText('Best ·')
  await range(page, '1M').click()
  await expect(rings(page)).toHaveCount(0)
  await expect(page.locator('.progressLegend')).toHaveCount(0)
})

test('a latest PR is labelled on the chart and replaces Best with NEW PR', async ({ page }) => {
  await pick(page, 'Seated row')
  await expect(page.locator('.progressChartPR')).toHaveText('PR')
  await expect(page.locator('.progressStatKicker').nth(1)).toHaveText('New PR')
  await expect(page.getByText(/^Up 5\.0 kg\/rep on your previous best \(60\.0, /)).toBeVisible()
  await expect(page.locator('.progressChart')).toHaveAttribute('aria-label', /the latest one a PR$/)
})

test('every session gets a node, distinct from PR rings and the latest point', async ({ page }) => {
  // Lat pulldown: six sessions, one PR (57), the latest (40) not a PR.
  const nodes = page.locator('.progressChart [data-kind]')
  await expect(nodes).toHaveCount(6)
  await expect(page.locator('.progressChart [data-kind="session"]')).toHaveCount(4)
  await expect(page.locator('.progressChart [data-kind="pr"]')).toHaveCount(1)
  await expect(page.locator('.progressChart [data-kind="last"]')).toHaveCount(1)
  // A plain node is a solid dot; a PR is a hollow ring, so they differ by shape as well as colour.
  await expect(page.locator('.progressChart [data-kind="session"]').first()).toHaveAttribute('fill', 'var(--color-text)')
  await expect(page.locator('.progressChart [data-kind="pr"]')).toHaveAttribute('fill', 'var(--color-bg)')
  await expect(page.locator('.progressLegendSession')).toHaveText('Session')
  await range(page, '5S').click()
  await expect(nodes).toHaveCount(5)
})

// Label boxes, and how close the line (sampled every 2px) and the nodes come to them.
const labelClearance = (page: Page) =>
  page.locator('.progressChart').first().evaluate((chart) => {
    const labels = [...chart.querySelectorAll('.progressChartTick')].map((el) => el.getBoundingClientRect())
    const path = chart.querySelector<SVGPathElement>('.recharts-line-curve')!
    const ctm = path.getScreenCTM()!
    const samples: Array<{ x: number; y: number; r: number }> = []
    for (let d = 0; d <= path.getTotalLength(); d += 2) {
      const p = path.getPointAtLength(d).matrixTransform(ctm)
      samples.push({ x: p.x, y: p.y, r: 1.5 })
    }
    for (const node of chart.querySelectorAll('circle')) {
      const b = node.getBoundingClientRect()
      samples.push({ x: b.x + b.width / 2, y: b.y + b.height / 2, r: b.width / 2 })
    }
    const gap = (s: { x: number; y: number; r: number }, l: DOMRect) =>
      Math.hypot(Math.max(l.left - s.x, 0, s.x - l.right), Math.max(l.top - s.y, 0, s.y - l.bottom)) - s.r
    return { labels: labels.length, closest: Math.min(...samples.flatMap((s) => labels.map((l) => gap(s, l)))) }
  })

test('the line and its nodes keep clear of the y-axis labels on every metric, phone and wide', async ({ page }) => {
  await pick(page, 'Lat pulldown')
  for (const width of [412, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    for (const name of ['Average', 'Peak', 'Total', 'e1RM']) {
      await metric(page, name).click()
      // The chart re-lays itself out after a resize; let it settle.
      await expect(async () => {
        const { labels, closest } = await labelClearance(page)
        expect(labels, `${name} ${width}`).toBe(2)
        expect(closest, `${name} ${width}`).toBeGreaterThanOrEqual(3)
      }).toPass({ timeout: 3000 })
    }
  }
})

test('on a phone the chart runs edge to edge and a rising line starts under the labels', async ({ page }) => {
  await pick(page, 'Seated row')
  const width = page.viewportSize()!.width
  const chart = (await page.locator('.progressChart').boundingBox())!
  expect(chart.x).toBe(0)
  expect(chart.width).toBe(width)
  const labelLeft = await page.locator('.progressChartTick').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().left))
  for (const left of labelLeft) expect(left).toBeCloseTo(16, 0)
  const centres = await page.locator('.progressChart circle').evaluateAll((els) =>
    els.map((el) => { const b = el.getBoundingClientRect(); return b.x + b.width / 2 }),
  )
  expect(Math.min(...centres)).toBeCloseTo(16, 0)
  expect(Math.max(...centres)).toBeCloseTo(width - 16, 0)
})

test('the info button explains the selected metric, by keyboard alone', async ({ page }) => {
  const info = page.getByRole('button', { name: 'About Average' })
  const panel = page.locator('.progressInfoPanel')
  await expect(info).toHaveAttribute('aria-expanded', 'false')
  await expect(panel).toBeHidden()
  const box = (await info.boundingBox())!
  expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44)

  await info.focus()
  await page.keyboard.press('Enter')
  await expect(info).toHaveAttribute('aria-expanded', 'true')
  await expect(panel).toContainText('Weight per rep across the session')
  await expect(panel).toContainText('A PR is a session that beat every earlier one on this metric.')
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])

  // It stays open while the metric changes, and follows it.
  await metric(page, 'e1RM').click()
  await expect(page.getByRole('button', { name: 'About e1RM' })).toHaveAttribute('aria-expanded', 'true')
  await expect(panel).toContainText('Epley')
  await expect(figures(page)).toHaveText(['56.0kg', '72.2kg'])

  // Focus is on the e1RM segment: Escape still closes the panel and hands focus to the info button.
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(page.getByRole('button', { name: 'About e1RM' })).toBeFocused()
  await page.keyboard.press('Space')
  await expect(panel).toBeVisible()
})

test('Stats with data has no detectable WCAG A/AA violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
})
