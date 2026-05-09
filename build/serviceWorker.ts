import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { Plugin } from 'vite'

export const CACHE_PREFIX = 'gymos-'
const SW_FILE = 'sw.js'

export interface BuiltFile {
  /** Path relative to the build root, with forward slashes. */
  path: string
  content: string | Uint8Array
}

/** Cache name derived from every built file, so any content change gives a new cache. */
export function cacheName(files: BuiltFile[]): string {
  const hash = createHash('sha256')
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(file.path).update('\0').update(file.content).update('\0')
  }
  return CACHE_PREFIX + hash.digest('hex').slice(0, 12)
}

export function precacheUrls(files: BuiltFile[]): string[] {
  return files
    .map((file) => file.path)
    .filter((path) => path !== SW_FILE && !path.endsWith('.map'))
    .map((path) => '/' + path)
    .sort()
}

/**
 * The worker precaches the whole build on install, answers same-origin GETs from that
 * cache, and falls back to the cached index.html when a navigation cannot reach the
 * network. It does not call skipWaiting: a new build takes over once every tab of the
 * old one is closed, so an open workout never mixes old and new files.
 */
export function renderServiceWorker(files: BuiltFile[]): string {
  return `const CACHE = ${JSON.stringify(cacheName(files))}
const PRECACHE = ${JSON.stringify(precacheUrls(files))}

// cache: 'reload' skips the HTTP cache, so an unhashed file such as index.html cannot
// be stored from the previous build.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })))),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(${JSON.stringify(CACHE_PREFIX)}) && key !== CACHE)
          .map((key) => caches.delete(key)),
      ),
    ),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/index.html', { cacheName: CACHE }).then((hit) => hit || Response.error()),
      ),
    )
    return
  }
  // Hosts may send Vary: Origin, and crossorigin scripts carry an Origin header that the
  // precache requests did not, so match on the URL alone.
  event.respondWith(
    caches
      .match(request, { cacheName: CACHE, ignoreVary: true })
      .then((hit) => hit || fetch(request)),
  )
})
`
}

function listFiles(dir: string): BuiltFile[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const full = join(entry.parentPath, entry.name)
      return { path: relative(dir, full).split(sep).join('/'), content: readFileSync(full) }
    })
}

/** Writes sw.js into the build, precaching the bundle and the public folder. Root hosting assumed. */
export function serviceWorker(): Plugin {
  let publicDir = ''
  return {
    name: 'gymos-service-worker',
    apply: 'build',
    // Run after Vite's HTML plugin has emitted index.html into the bundle.
    enforce: 'post',
    configResolved(config) {
      publicDir = config.publicDir
    },
    generateBundle(_options, bundle) {
      const files: BuiltFile[] = Object.values(bundle).map((item) => ({
        path: item.fileName,
        content: item.type === 'chunk' ? item.code : item.source,
      }))
      if (publicDir) files.push(...listFiles(publicDir))
      this.emitFile({ type: 'asset', fileName: SW_FILE, source: renderServiceWorker(files) })
    },
  }
}
