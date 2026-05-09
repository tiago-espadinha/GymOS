import { describe, expect, it } from 'vitest'

const sheets = import.meta.glob<string>('/src/**/*.css', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const tokens = Object.entries(sheets).find(([file]) => file.endsWith('/styles/tokens.css'))?.[1] ?? ''

const token = (name: string) => tokens.match(new RegExp(`${name}:\\s*([0-9]+px)`))?.[1]

describe('breakpoints', () => {
  it('are defined in tokens.css', () => {
    expect(token('--breakpoint-tablet')).toBe('600px')
    expect(token('--breakpoint-wide')).toBe('1024px')
  })

  it('are the only widths a media query uses', () => {
    const allowed = new Set([token('--breakpoint-tablet'), token('--breakpoint-wide')])
    // Every length in a media query's prelude, so compound and range queries count too.
    const used = Object.entries(sheets).flatMap(([file, text]) =>
      [...text.matchAll(/@media([^{]*)\{/g)].flatMap((m) =>
        [...m[1].matchAll(/[0-9.]+(?:px|r?em)/g)].map((w) => ({ file, width: w[0] })),
      ),
    )
    expect(used.length).toBeGreaterThan(0)
    expect(used.filter((u) => !allowed.has(u.width))).toEqual([])
  })
})
