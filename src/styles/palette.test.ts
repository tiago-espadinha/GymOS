import { describe, expect, it } from 'vitest'

const colour = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/
const namedColour = /(?:^|[\s:;])(?:color|background(?:-color)?|border(?:-color)?)\s*:\s*[^;{}]*\b(?:white|black)\b/m

const sources = import.meta.glob<string>(
  ['/src/**/*.{css,ts,tsx}', '!/src/**/*.test.ts', '!/src/styles/tokens.css'],
  { query: '?raw', import: 'default', eager: true },
)

const tokenFile = import.meta.glob<string>('/src/styles/tokens.css', {
  query: '?raw',
  import: 'default',
  eager: true,
})

describe('palette', () => {
  it('keeps colour literals inside the tokens file', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(20)
    const offenders = Object.entries(sources)
      .filter(([, text]) => colour.test(text) || namedColour.test(text))
      .map(([file]) => file)
    expect(offenders).toEqual([])
  })

  it('references only tokens that tokens.css defines', () => {
    const tokens = Object.values(tokenFile)[0] ?? ''
    const defined = new Set([...tokens.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]))
    expect(defined.size).toBeGreaterThan(20)
    const unknown = Object.entries(sources).flatMap(([file, text]) =>
      [...text.matchAll(/var\((--[A-Za-z0-9-]+)/g)]
        .map((m) => m[1])
        .filter((name) => !defined.has(name))
        .map((name) => `${file} ${name}`),
    )
    expect(unknown).toEqual([])
  })
})
