import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build } from 'vite'
import { afterAll, describe, expect, it } from 'vitest'
import { cacheName, precacheUrls, renderServiceWorker } from './serviceWorker'

const files = [
  { path: 'index.html', content: '<html></html>' },
  { path: 'assets/index-abc.js', content: 'console.log(1)' },
  { path: 'assets/index-abc.js.map', content: '{}' },
  { path: 'sw.js', content: 'old worker' },
]

describe('service worker generator', () => {
  it('precaches every built file except the worker itself and source maps', () => {
    expect(precacheUrls(files)).toEqual(['/assets/index-abc.js', '/index.html'])
  })

  it('names the cache after the build content', () => {
    const changed = files.map((file) =>
      file.path === 'index.html' ? { ...file, content: '<html>v2</html>' } : file,
    )
    expect(cacheName(files)).toMatch(/^gymos-[0-9a-f]{12}$/)
    expect(cacheName([...files].reverse())).toBe(cacheName(files))
    expect(cacheName(changed)).not.toBe(cacheName(files))
  })

  it('does not take over open tabs when a new build installs', () => {
    expect(renderServiceWorker(files)).not.toMatch(/skipWaiting|clients\.claim/)
  })
})

describe('production build', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'gymos-build-'))
  afterAll(() => rmSync(outDir, { recursive: true, force: true }))

  it('writes sw.js that precaches index.html, every asset and the public files', async () => {
    await build({ logLevel: 'silent', build: { outDir, emptyOutDir: true } })

    const worker = readFileSync(join(outDir, 'sw.js'), 'utf8')
    const precache: string[] = JSON.parse(/const PRECACHE = (.*)/.exec(worker)![1])
    const built = readdirSync(outDir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name !== 'sw.js')
      .map((entry) => '/' + join(entry.parentPath, entry.name).slice(outDir.length + 1))

    expect(precache).toContain('/index.html')
    expect(precache.some((url) => url.endsWith('.woff2'))).toBe(true)
    expect(precache.sort()).toEqual(built.sort())
  }, 60_000)
})
