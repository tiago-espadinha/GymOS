import { expect, test, type Page } from '@playwright/test'
import { finishButton, logSet } from './log-set'

// Every shared primitive, measured where the app mounts it: a hit area of at least
// 44px in both dimensions and a visible indicator when reached with the keyboard.
const primitives = {
  PillButton: '.pill-button',
  PrimaryButton: '.primary-button',
  ChipGroup: '.chip-group__chip',
  SegmentedControl: '.segmented__segment',
  Field: '.field__input',
  ListRow: '.list-row--button',
  TabBar: '.tab-bar__tab',
  Select: '.select__button',
  Switch: '.switch',
  StepperBlock: '.stepper-block__button',
} as const

type Name = keyof typeof primitives

const plan = {
  id: 'p1',
  name: 'Push day',
  desc: '',
  exercises: [{ id: 'e1', name: 'Bench press', muscleGroup: 'Chest' }],
}

const session = {
  id: 's1',
  planId: 'p1',
  planName: 'Push day',
  date: '2026-01-05',
  notes: '',
  exercises: [{ id: 'e1', name: 'Bench press', muscleGroup: 'Chest', sets: [{ id: 'x', weight: '60', reps: '8' }] }],
}

const sized = new Set<Name>()
const focused = new Set<Name>()

/** Every visible primitive on screen is at least 44 x 44. */
async function measure(page: Page, screen: string) {
  for (const [name, selector] of Object.entries(primitives) as [Name, string][]) {
    for (const el of await page.locator(`${selector}:visible`).all()) {
      const box = await el.boundingBox()
      if (!box) continue
      const label = `${name} "${(await el.getAttribute('aria-label')) ?? (await el.innerText()).trim()}" on ${screen}`
      expect.soft(box.width, `${label} width`).toBeGreaterThanOrEqual(44)
      expect.soft(box.height, `${label} height`).toBeGreaterThanOrEqual(44)
      sized.add(name)
    }
  }
}

/** Tab through the screen; every primitive that takes focus shows an indicator. */
async function tabThrough(page: Page, screen: string) {
  await page.locator('body').click({ position: { x: 1, y: 1 } })
  // Elements already checked, by identity. A date input takes one Tab per part, so
  // repeats are skipped rather than taken as the end of the walk.
  await page.evaluate(() => ((window as unknown as { visited: WeakSet<Element> }).visited = new WeakSet()))
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate((selectors) => {
      const el = document.activeElement as HTMLElement | null
      if (!el || el === document.body) return null
      const visited = (window as unknown as { visited: WeakSet<Element> }).visited
      if (visited.has(el)) return { repeat: true } as const
      visited.add(el)
      const name = Object.entries(selectors).find(([, s]) => el.matches(s))?.[0] ?? null
      // An indicator is any change to outline, border or shadow between focused and not.
      const look = () => {
        const s = getComputedStyle(el)
        return [s.outlineStyle, s.outlineWidth, s.outlineColor, s.borderColor, s.boxShadow].join('|')
      }
      const withFocus = look()
      el.blur()
      const withoutFocus = look()
      el.focus()
      const indicator = withFocus !== withoutFocus
      return { repeat: false, name, indicator, focusVisible: el.matches(':focus-visible'), text: el.innerText?.trim() || el.getAttribute('aria-label') || '' }
    }, primitives)
    if (!info || info.repeat || !info.name) continue
    const label = `${info.name} "${info.text}" on ${screen}`
    expect.soft(info.focusVisible, `${label} matches :focus-visible`).toBe(true)
    expect.soft(info.indicator, `${label} shows a focus indicator`).toBe(true)
    focused.add(info.name as Name)
  }
}

async function check(page: Page, screen: string) {
  await measure(page, screen)
  await tabThrough(page, screen)
}

test('every shared primitive has a 44px hit area and a visible focus state', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.addInitScript(
    ([p, s]) => {
      if (!localStorage.getItem('gym:plans')) localStorage.setItem('gym:plans', JSON.stringify([p]))
      if (!localStorage.getItem('gym:sessions')) localStorage.setItem('gym:sessions', JSON.stringify([s]))
    },
    [plan, session] as const,
  )
  await page.goto('/')

  await check(page, 'Plans')

  await page.getByRole('button', { name: '+ Create New' }).click()
  await check(page, 'New plan')
  await page.getByRole('button', { name: 'Cancel' }).click()

  await page.getByRole('button', { name: 'Log', exact: true }).click()
  await check(page, 'Log home')

  await page.getByRole('button', { name: 'Stats', exact: true }).click()
  await check(page, 'Stats')

  await page.getByRole('button', { name: 'Settings' }).click()
  await check(page, 'Settings')
  await page.getByRole('button', { name: 'Close' }).click()
  await page.getByRole('button', { name: 'Plans', exact: true }).click()

  await page.getByRole('button', { name: 'Start Push day' }).click()
  await check(page, 'Session list')

  await page.getByRole('button', { name: /^Bench press/ }).click()
  await check(page, 'Exercise')
  await logSet(page, '60', '8')
  await page.getByRole('button', { name: 'All exercises' }).click()
  await finishButton(page).click()
  await check(page, 'Finish')

  const all = Object.keys(primitives).sort()
  expect([...sized].sort(), 'primitives measured').toEqual(all)
  expect([...focused].sort(), 'primitives reached by keyboard').toEqual(all)
})
