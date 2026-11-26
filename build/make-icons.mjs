// Renders the PNG app icons from public/icon.svg. Run after changing the mark:
//   node build/make-icons.mjs
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const svg = readFileSync('public/icon.svg', 'utf8')

// A maskable icon may be cropped to a circle of 40% radius, so the ticks shrink
// about the centre until every corner sits inside it.
const maskable = svg
  .replace(/(<rect width="100" height="100" fill="#000"\/>)/, '$1<g transform="translate(10 10) scale(0.8)">')
  .replace(/<\/svg>$/, '</g></svg>')

const outputs = [
  { file: 'public/icon-192.png', size: 192, source: svg },
  { file: 'public/icon-512.png', size: 512, source: svg },
  { file: 'public/icon-maskable-512.png', size: 512, source: maskable },
  { file: 'public/apple-touch-icon.png', size: 180, source: svg },
]

const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })
for (const { file, size, source } of outputs) {
  await page.setViewportSize({ width: size, height: size })
  const sized = source.replace('<svg ', `<svg width="${size}" height="${size}" `)
  await page.setContent(`<body style="margin:0">${sized}</body>`)
  await page.locator('svg').screenshot({ path: file })
  console.log(file)
}
await browser.close()
