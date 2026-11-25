import { beforeEach, describe, expect, it, vi } from 'vitest'
import tokens from '../styles/tokens.css?raw'
import { ACCENTS, loadAccent, saveAccent } from './accentPrefs'

const KEY = 'gym:accent'
let store: Map<string, string>
let root: { dataset: Record<string, string> }

beforeEach(() => {
  store = new Map()
  root = { dataset: {} }
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  })
  vi.stubGlobal('document', { documentElement: root })
})

describe('loadAccent', () => {
  it('uses lime when nothing is stored', () => {
    expect(loadAccent()).toBe('lime')
  })

  it('reads a stored accent', () => {
    store.set(KEY, JSON.stringify('violet'))
    expect(loadAccent()).toBe('violet')
  })

  it('falls back to lime for an unknown, corrupt or unreadable value', () => {
    store.set(KEY, JSON.stringify('pink'))
    expect(loadAccent()).toBe('lime')
    store.set(KEY, '{oops')
    expect(loadAccent()).toBe('lime')
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
    })
    expect(loadAccent()).toBe('lime')
  })
})

describe('saveAccent', () => {
  it('stores and applies the accent', () => {
    expect(saveAccent('cyan')).toBe(true)
    expect(loadAccent()).toBe('cyan')
    expect(root.dataset.accent).toBe('cyan')
  })

  it('reports a refused write and changes nothing', () => {
    store.set(KEY, JSON.stringify('amber'))
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: () => {
        throw new Error('quota')
      },
    })
    expect(saveAccent('red')).toBe(false)
    expect(loadAccent()).toBe('amber')
    expect(root.dataset.accent).toBeUndefined()
  })
})

const token = (name: string) => {
  const value = tokens.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1]
  if (!value) throw new Error(`${name} is not a hex token`)
  return value
}

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe.each(ACCENTS.map((a) => a.id))('accent %s', (id) => {
  const accent = token(`--accent-${id}`)

  it('keeps on-accent text at 4.5:1 or more', () => {
    expect(contrast(accent, token('--color-on-accent'))).toBeGreaterThanOrEqual(4.5)
  })

  it('stands out at 3:1 or more on the background and on surfaces', () => {
    expect(contrast(accent, token('--color-bg'))).toBeGreaterThanOrEqual(3)
    expect(contrast(accent, token('--color-surface'))).toBeGreaterThanOrEqual(3)
  })

  it('has an override that points the accent at it', () => {
    if (id === 'lime') {
      expect(tokens).toContain('--color-accent: var(--accent-lime);')
    } else {
      expect(tokens).toMatch(new RegExp(`:root\\[data-accent="${id}"\\]\\s*\\{\\s*--color-accent: var\\(--accent-${id}\\);`))
    }
  })
})
