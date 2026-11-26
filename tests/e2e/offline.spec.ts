import { expect, test } from '@playwright/test'

test('the app reloads with no network after a first visit', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
  // The worker controls pages opened after it installs, not the one that installed it.
  await page.reload()
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)

  await context.setOffline(true)
  const response = await page.reload()

  expect(response?.fromServiceWorker()).toBe(true)
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('button')).toHaveText([
    'Plans',
    'Log',
    'Stats',
    'Settings',
  ])
  const loadedFaces = await page.evaluate(() =>
    document.fonts.load('900 1em "Big Shoulders Display"').then((faces) => faces.length),
  )
  expect(loadedFaces).toBeGreaterThan(0)
  const cacheNames = await page.evaluate(() => caches.keys())
  expect(cacheNames).toHaveLength(1)
  expect(cacheNames[0]).toMatch(/^gymos-/)

  // A file outside the cache fails, so the reload above came from the cache and not from
  // a network the worker could still reach.
  const uncached = await page.evaluate(() =>
    fetch('/manifest.webmanifest?uncached').then(() => 'online', () => 'offline'),
  )
  expect(uncached).toBe('offline')
})
