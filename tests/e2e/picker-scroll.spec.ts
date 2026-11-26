import { expect, test, type Page } from '@playwright/test'

// Scrolling inside the open plan picker must never move the Log page behind it, whether the
// list fits the screen (nothing to scroll, so the gesture would chain to the page) or not
// (the gesture chains once the list reaches its end).

// Mobile WebKit refuses mouse.wheel; without the mobile flag it scrolls by wheel at the same
// phone viewport, so both engines run the same gesture.
test.use({ isMobile: false })

const plan = (i: number) => ({
  id: `p${i}`,
  name: `Plan ${i}`,
  desc: '',
  exercises: [{ id: `e${i}`, name: 'Bench press', muscleGroup: 'Chest' }],
})

// Six sessions fill Recent, so the Log page is taller than the phone screen.
const sessions = Array.from({ length: 6 }, (_, i) => ({
  id: `s${i}`,
  planId: 'p0',
  planName: 'Plan 0',
  date: `2026-11-${String(16 - i).padStart(2, '0')}`,
  notes: '',
  exercises: [{ id: 'e0', name: 'Bench press', muscleGroup: 'Chest', sets: [{ id: 'a', weight: '60', reps: '10' }] }],
}))

const seed = (page: Page, planCount: number) =>
  page.addInitScript(
    ([p, s]) => {
      localStorage.setItem('gym:plans', JSON.stringify(p))
      localStorage.setItem('gym:sessions', JSON.stringify(s))
    },
    [Array.from({ length: planCount }, (_, i) => plan(i)), sessions] as const,
  )

const openPicker = async (page: Page) => {
  await page.goto('/')
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Log' }).click()
  const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
  expect(pageHeight, 'the Log page must be scrollable for this test to mean anything').toBeGreaterThan(50)
  await page.getByRole('button', { name: /^Training plan: / }).click()
  const picker = page.getByRole('dialog', { name: 'Pick a plan' })
  await expect(picker).toBeVisible()
  return picker
}

/** Swipes over the list: wheel in every engine, plus a real touch scroll where the DevTools protocol has one. */
const swipe = async (page: Page, x: number, y: number, deltaY: number) => {
  await page.mouse.move(x, y)
  await page.mouse.wheel(0, deltaY)
  if (test.info().project.name.includes('chromium')) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.synthesizeScrollGesture', {
      x,
      y,
      yDistance: -deltaY,
      gestureSourceType: 'touch',
      speed: 2000,
    })
    await cdp.detach()
  }
  // Let momentum and scroll events settle.
  await page.waitForTimeout(300)
}

for (const [label, count] of [
  ['shorter', 3],
  ['longer', 30],
] as const) {
  test(`scrolling a plan list ${label} than the screen never scrolls the page behind`, async ({ page }) => {
    await seed(page, count)
    const picker = await openPicker(page)
    const list = picker.getByRole('listbox')
    const box = (await list.boundingBox())!
    const x = box.x + box.width / 2
    const y = box.y + Math.min(box.height, page.viewportSize()!.height - box.y) / 2

    const fits = await picker.evaluate((el) => el.scrollHeight <= el.clientHeight)
    expect(fits).toBe(count === 3)

    for (const delta of [1500, 1500, -3000, -1500]) {
      await swipe(page, x, y, delta)
      expect(await page.evaluate(() => window.scrollY)).toBe(0)
    }
    if (count === 30) {
      // The list itself still scrolls.
      await swipe(page, x, y, 600)
      expect(await picker.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
    }
  })
}

test('closing the picker leaves the page where it was and scrollable', async ({ page }) => {
  await seed(page, 3)
  await page.goto('/')
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Log' }).click()
  await page.evaluate(() => window.scrollTo(0, 40))
  const before = await page.evaluate(() => window.scrollY)
  expect(before).toBeGreaterThan(0)
  await page.getByRole('button', { name: /^Training plan: / }).click()
  const picker = page.getByRole('dialog', { name: 'Pick a plan' })
  await expect(picker).toBeVisible()
  await picker.getByRole('button', { name: 'Close' }).click()
  await expect(picker).toHaveCount(0)
  expect(await page.evaluate(() => window.scrollY)).toBe(before)
  await page.mouse.wheel(0, 200)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before)
})
