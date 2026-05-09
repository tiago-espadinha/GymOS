import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { restStarted } from './rest-started'

const plan = {
  id: 'p1',
  name: 'Core day',
  desc: '',
  exercises: [
    { id: 'e1', name: 'Plank', muscleGroup: 'Core', category: 'calisthenics', trackingType: 'time' },
    { id: 'e2', name: 'Rowing', muscleGroup: 'Cardio', category: 'cardio', trackingType: 'time', trackDistance: true, distanceUnit: 'km' },
  ],
}

test.beforeEach(async ({ page }) => {
  // Paused, so the clock only moves when a test fast-forwards it.
  await page.clock.install({ time: new Date('2026-01-05T10:00:00') })
  await page.clock.pauseAt(new Date('2026-01-05T10:00:05'))
  await page.addInitScript((p) => {
    if (!localStorage.getItem('gym:plans')) localStorage.setItem('gym:plans', JSON.stringify([p]))
  }, plan)
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Core day' }).click()
  await page.getByRole('button', { name: /^Plank/ }).click()
})

const hold = (page: Page) => page.getByRole('timer', { name: /^Hold/ })
const rest = (page: Page) => page.getByRole('timer', { name: /^Rest/ })
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const restSwitch = (page: Page) => page.getByRole('switch', { name: /^Then rest/ })
// Hidden exercise screens stay mounted; these look at the one on screen.
const shown = (page: Page, selector: string) => page.locator(`.exerciseScreen:not([hidden]) ${selector}`)
// The face is drawn twice (plain and on the fill); the first is the plain one.
const logged = (page: Page) => shown(page, '.setsTableValues--done')
const label = (page: Page) => shown(page, '.timerBlockTop').first()

// Height of the white fill as a share of the block.
const fillShare = (page: Page) =>
  page.evaluate(() => {
    const block = document.querySelector('.exerciseScreen:not([hidden]) .timerBlock')!.getBoundingClientRect()
    const fill = document.querySelector('.exerciseScreen:not([hidden]) .timerBlockFill')!.getBoundingClientRect()
    return fill.height / block.height
  })

test('idle shows the category target (calisthenics: 15s) and Start hold begins the hold', async ({ page }) => {
  await expect(hold(page)).toContainText('00:15')
  await expect(label(page)).toContainText('Hold · ready')
  await expect(label(page)).toContainText('Set 1 of 1')
  expect(await fillShare(page)).toBe(0)
  await expect(shown(page, '.timerBlockControls').getByRole('button')).toHaveCount(0)
  await expect(restSwitch(page)).toHaveAttribute('aria-checked', 'true')
  await button(page, 'Start hold').click()
  await page.clock.fastForward(5_000)
  await expect(hold(page)).toContainText('00:05')
})

test('the hold fills white in step with elapsed time', async ({ page }) => {
  await button(page, 'Start hold').click()
  await page.clock.fastForward(5_000)
  await expect.poll(() => fillShare(page)).toBeCloseTo(1 / 3, 1)
  await page.clock.fastForward(5_000)
  await expect.poll(() => fillShare(page)).toBeCloseTo(2 / 3, 1)
  const fill = await shown(page, '.timerBlockFill').evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(fill).toBe('rgb(255, 255, 255)')
})

test('at the target the hold is logged and a lime rest starts; Skip saves the rest taken', async ({ page }) => {
  await button(page, 'Start hold').click()
  await page.clock.fastForward(15_000)
  await expect(hold(page)).toHaveCount(0)
  await expect(rest(page)).toBeVisible()
  const fill = await shown(page, '.timerBlockFill').evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(fill).toBe('rgb(198, 255, 61)')
  await restStarted(page)
  await page.clock.fastForward(10_000)
  await button(page, 'Skip').click()
  await expect(rest(page)).toHaveCount(0)
  await expect(logged(page)).toHaveText('00:15 · rest 00:10')
  // The next set is ready with the same target.
  await expect(hold(page)).toContainText('00:15')
})

test('Finish early records the time held, not the target', async ({ page }) => {
  await button(page, 'Start hold').click()
  await page.clock.fastForward(7_000)
  await button(page, 'Stop and log').click()
  await expect(rest(page)).toBeVisible()
  await button(page, 'Skip').click()
  await expect(logged(page)).toHaveText('00:07 · rest 00:00')
})

test('a target chip sets the target', async ({ page }) => {
  const chips = page.getByRole('group', { name: 'Target time' })
  await chips.getByRole('button', { name: '45s' }).click()
  await expect(chips.getByRole('button', { name: '45s' })).toHaveAttribute('aria-pressed', 'true')
  await expect(hold(page)).toContainText('00:45')
})

test('with the rest off, past the target the block is full and the time held is logged', async ({ page }) => {
  await restSwitch(page).click()
  await button(page, 'Start hold').click()
  await page.clock.fastForward(20_000)
  await expect(hold(page)).toContainText('+0:05')
  await expect(label(page)).toContainText('Hold · past target')
  await expect(page.getByText('00:15 reached').first()).toBeVisible()
  await expect.poll(() => fillShare(page)).toBe(1)
  const fill = await shown(page, '.timerBlockFill').evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(fill).toBe('rgb(255, 255, 255)')
  await expect(page.getByRole('group', { name: 'Target time' })).toHaveCount(0)
  await expect(shown(page, '.timerBlockControls').getByRole('button')).toHaveText(['Pause'])
  await button(page, 'Stop and log 00:20').click()
  await expect(rest(page)).toHaveCount(0)
  await expect(logged(page)).toHaveText('00:20')
})

test('Pause stops the clock and Resume continues it; +step lengthens the target', async ({ page }) => {
  await button(page, 'Start hold').click()
  await page.clock.fastForward(4_000)
  await button(page, 'Pause').click()
  await expect(label(page)).toContainText('Hold · paused')
  await expect(button(page, 'Stop and log 00:04')).toBeVisible()
  await page.clock.fastForward(30_000)
  await expect(hold(page)).toContainText('00:04')
  await button(page, 'Resume').click()
  await button(page, '+5s').click()
  await expect(page.getByText('of 00:20').first()).toBeVisible()
})

test('Stop on a paused hold drops it and goes back to ready', async ({ page }) => {
  await button(page, 'Start hold').click()
  await page.clock.fastForward(4_000)
  await button(page, 'Pause').click()
  await button(page, 'Stop').click()
  await expect(label(page)).toContainText('Hold · ready')
  await expect(hold(page)).toContainText('00:15')
  await expect(logged(page)).toHaveCount(0)
})

test('during a chained rest the next hold shows, and Start hold now saves the rest so far', async ({ page }) => {
  await button(page, 'Start hold').click()
  await page.clock.fastForward(15_000)
  await restStarted(page)
  await expect(page.getByText('Set 1 logged · 00:15')).toBeVisible()
  await expect(page.getByText('Next · Set 2 of 2')).toBeVisible()
  await expect(label(page)).toContainText('Plank · set 2 next')
  await expect(button(page, '−5s')).toBeVisible()
  await expect(page.getByRole('group', { name: 'Target time' })).toBeVisible()
  await page.clock.fastForward(6_000)
  await button(page, 'Start hold now').click()
  await expect(rest(page)).toHaveCount(0)
  await expect(label(page)).toContainText('Hold')
  await expect(button(page, 'Pause')).toBeVisible()
  await expect(logged(page)).toHaveText('00:15 · rest 00:06')
})

test('a reload during a chained rest, then Skip, still saves the rest', async ({ page }) => {
  await button(page, 'Start hold').click()
  await page.clock.fastForward(15_000)
  await restStarted(page)
  await page.clock.fastForward(4_000)
  await page.reload()
  await page.getByRole('button', { name: /^Plank/ }).click()
  await page.clock.fastForward(4_000)
  await button(page, 'Skip').click()
  await expect(logged(page)).toHaveText('00:15 · rest 00:08')
  await expect(button(page, 'Start hold')).toBeVisible()
})

test('cardio: the distance has a label and is saved with the set on Stop and log', async ({ page }) => {
  await button(page, 'All exercises').click()
  await page.getByRole('button', { name: /^Rowing/ }).click()
  await expect(label(page)).toContainText('Effort · ready')
  await expect(restSwitch(page)).toHaveAttribute('aria-checked', 'false')
  await button(page, 'Start effort').click()
  await expect(page.getByRole('group', { name: 'Target time' })).toHaveCount(0)
  const distance = page.getByRole('textbox', { name: 'Distance · set 1' })
  await distance.fill('1.2')
  await expect(page.getByText('Distance · set 1', { exact: true })).toBeVisible()
  // A distance alone does not log the set.
  await expect(logged(page)).toHaveCount(0)
  await page.clock.fastForward(30_000)
  await button(page, 'Stop and log').click()
  await expect(logged(page)).toHaveText('00:30 · 1.2 km')
  await expect(page.getByRole('textbox', { name: 'Distance · set 2' })).toHaveValue('')
})

test('cardio: a logged distance and time can be edited and survive a reload', async ({ page }) => {
  await button(page, 'All exercises').click()
  await page.getByRole('button', { name: /^Rowing/ }).click()
  await button(page, 'Start effort').click()
  await page.clock.fastForward(30_000)
  await button(page, 'Stop and log').click()
  await button(page, 'Edit set 1').click()
  await page.getByRole('textbox', { name: 'Distance · set 1' }).fill('2,5')
  await page.getByRole('textbox', { name: 'Time', exact: true }).fill('240')
  await button(page, 'Save set 1').click()
  await expect(logged(page)).toHaveText('04:00 · 2.5 km')
  await expect(button(page, 'Edit set 1')).toBeFocused()
  await page.reload()
  await page.getByRole('button', { name: /^Rowing/ }).click()
  await expect(logged(page)).toHaveText('04:00 · 2.5 km')
})

test('a running hold survives a reload and follows the real clock', async ({ page }) => {
  await button(page, 'Start hold').click()
  await page.clock.fastForward(6_000)
  await page.reload()
  await page.getByRole('button', { name: /^Plank/ }).click()
  await page.clock.fastForward(1_000)
  await expect(hold(page)).toContainText('00:07')
})

test('phase changes are announced once the block is up', async ({ page }) => {
  await button(page, 'Start hold').click()
  await page.clock.fastForward(500)
  await expect(page.getByRole('status').filter({ hasText: 'Hold' })).toHaveText('Hold running')
})

test('the timed set view has no detectable WCAG A/AA violations', async ({ page }) => {
  await button(page, 'Start hold').click()
  await page.clock.fastForward(5_000)
  await page.clock.resume() // axe needs the page's timers
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.html + n.any.map((a) => a.message).join())}`)).toEqual([])
})

test('a logged hold is followed by the next hold, with no "+ Set"', async ({ page }) => {
  await button(page, 'Start hold').click()
  await page.clock.fastForward(7_000)
  await button(page, 'Stop and log').click()
  await button(page, 'Skip').click()
  await expect(logged(page)).toHaveCount(1)
  await expect(hold(page)).toBeVisible()
  await expect(button(page, '+ Set')).toHaveCount(0)
})

test('a logged hold can be edited, cancelled and deleted', async ({ page }) => {
  await button(page, 'Start hold').click()
  await page.clock.fastForward(7_000)
  await button(page, 'Stop and log').click()
  await button(page, 'Skip').click()
  await button(page, 'Edit set 1').click()
  await expect(hold(page)).toHaveCount(0)
  await page.getByRole('textbox', { name: 'Time', exact: true }).fill('12')
  await expect(shown(page, '.setsTableRow--inverted')).toContainText('00:07 · rest 00:00 → 00:12 · rest 00:00')
  await button(page, 'Cancel').click()
  await expect(logged(page)).toHaveText('00:07 · rest 00:00')
  await expect(hold(page)).toBeVisible()
  await button(page, 'Edit set 1').click()
  await page.getByRole('textbox', { name: 'Time', exact: true }).fill('0')
  await expect(button(page, 'Save set 1')).toBeDisabled()
  await button(page, 'Delete set 1').click()
  await expect(logged(page)).toHaveCount(0)
})

test('editing a saved timed session keeps its last set and offers the next hold', async ({ page }) => {
  await button(page, 'Start hold').click()
  await page.clock.fastForward(7_000)
  await button(page, 'Stop and log').click()
  await button(page, 'Skip').click()
  await button(page, 'All exercises').click()
  await page.getByRole('button', { name: 'Finish session' }).first().click()
  await page.getByRole('button', { name: 'Save session' }).click()
  // Imported or older sets carry no "completed" flag.
  await page.evaluate(() => {
    const sessions = JSON.parse(localStorage.getItem('gym:sessions')!)
    for (const s of sessions) for (const e of s.exercises) for (const set of e.sets) delete set.completed
    localStorage.setItem('gym:sessions', JSON.stringify(sessions))
  })
  await page.reload()
  await page.getByRole('button', { name: /^Edit/ }).first().click()
  await page.getByRole('button', { name: /^Plank/ }).click()
  await expect(logged(page)).toHaveText('00:07 · rest 00:00')
  await expect(hold(page)).toBeVisible()
})

test('cancelling a session forgets a hold in progress', async ({ page }) => {
  await button(page, 'Start hold').click()
  await page.clock.fastForward(3_000)
  await button(page, 'All exercises').click()
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Cancel' }).click()
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.endsWith('-work')))
  expect(keys).toEqual([])
})

test('the minus button stops at the smallest step so a hold always has a target', async ({ page }) => {
  await button(page, 'Start hold').click()
  await button(page, '−5s').click()
  await button(page, '−5s').click()
  await expect(page.getByText('of 00:05').first()).toBeVisible()
  await expect(button(page, '−5s')).toBeDisabled()
})

test('removing a logged hold never gives two sets the same id', async ({ page }) => {
  const holdFor = async (ms: number) => {
    await button(page, 'Start hold').click()
    await page.clock.fastForward(ms)
    await button(page, 'Stop and log').click()
    await button(page, 'Skip').click()
  }
  const deleteSet = async (n: number) => {
    await button(page, `Edit set ${n}`).click()
    await button(page, `Delete set ${n}`).click()
  }
  // Each target is the last hold, so shorter holds keep Finish in reach.
  await holdFor(5_000)
  await holdFor(4_000)
  await deleteSet(1)
  await holdFor(3_000)
  await expect(logged(page)).toHaveText(['00:04 · rest 00:00', '00:03 · rest 00:00'])
  const ids = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('gym:activeSession')!).exercises[0].sets.map((s: { id: string }) => s.id),
  )
  expect(new Set(ids).size).toBe(ids.length)
})
