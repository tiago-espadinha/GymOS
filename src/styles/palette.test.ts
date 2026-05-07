import { describe, expect, it } from 'vitest'

const colour = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/

const sources = import.meta.glob<string>(
  ['/src/**/*.{css,ts,tsx}', '!/src/**/*.test.ts', '!/src/styles/tokens.css'],
  { query: '?raw', import: 'default', eager: true },
)

describe('palette', () => {
  it('keeps colour literals inside the tokens file', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(20)
    const offenders = Object.entries(sources)
      .filter(([, text]) => colour.test(text))
      .map(([file]) => file)
    expect(offenders).toEqual([])
  })
})
