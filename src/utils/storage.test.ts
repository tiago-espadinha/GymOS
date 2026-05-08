import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getFromStorage, saveToStorage } from './storage'

function stubLocalStorage() {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  })
  return store
}

describe('storage', () => {
  beforeEach(() => {
    stubLocalStorage()
  })

  it('round-trips JSON values', async () => {
    expect(saveToStorage('k', { a: [1, 2] })).toBe(true)
    expect(await getFromStorage('k')).toEqual({ a: [1, 2] })
  })

  it('returns null for a missing key', async () => {
    expect(await getFromStorage('missing')).toBeNull()
  })

  it('returns null when the stored value is not valid JSON', async () => {
    localStorage.setItem('bad', '{oops')
    expect(await getFromStorage('bad')).toBeNull()
  })

  it('reports a write error such as a full quota instead of throwing', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError')
      },
    })
    expect(saveToStorage('k', 1)).toBe(false)
  })
})
