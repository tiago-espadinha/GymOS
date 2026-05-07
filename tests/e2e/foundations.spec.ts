import { expect, test } from '@playwright/test'

test('fonts are bundled and nothing is fetched from another origin', async ({ page }) => {
  const external: string[] = []
  const fonts: string[] = []
  page.on('request', (req) => {
    const url = new URL(req.url())
    if (url.origin !== 'http://localhost:4173') external.push(req.url())
    if (req.resourceType() === 'font') fonts.push(url.pathname)
  })
  // Block anything that is not the app's own origin, as an offline device would.
  await page.route((url) => url.origin !== 'http://localhost:4173', (route) => route.abort())

  await page.goto('/')
  await page.evaluate(() => document.fonts.load('900 1em "Big Shoulders Display"'))
  await page.evaluate(() => document.fonts.load('500 1em Inter'))
  await page.evaluate(() => document.fonts.load('600 1em Inter'))
  await page.evaluate(() => document.fonts.load('700 1em Inter'))

  expect(external).toEqual([])
  expect(await page.evaluate(() => document.fonts.check('900 1em "Big Shoulders Display"'))).toBe(true)
  for (const weight of [500, 600, 700]) {
    expect(await page.evaluate((w) => document.fonts.check(`${w} 1em Inter`), weight)).toBe(true)
  }
  expect(fonts.length).toBeGreaterThanOrEqual(4)
})

test('body is black with white Inter text', async ({ page }) => {
  await page.goto('/')
  const style = await page.evaluate(() => {
    const s = getComputedStyle(document.body)
    return { background: s.backgroundColor, color: s.color, family: getComputedStyle(document.documentElement).fontFamily }
  })
  expect(style.background).toBe('rgb(0, 0, 0)')
  expect(style.color).toBe('rgb(255, 255, 255)')
  expect(style.family.startsWith('Inter')).toBe(true)
})

test('theme colour and manifest background are black', async ({ page, request }) => {
  await page.goto('/')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#000000')
  const manifest = await (await request.get('/manifest.webmanifest')).json()
  expect(manifest.background_color).toBe('#000000')
  expect(manifest.theme_color).toBe('#000000')
})
