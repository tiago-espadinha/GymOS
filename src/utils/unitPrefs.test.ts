import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadUnitPrefs, saveUnitPrefs } from './unitPrefs'

const KEY = 'gym:unitPrefs'
let store: Map<string, string>

beforeEach(() => {
  store = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  })
})

describe('loadUnitPrefs', () => {
  it('uses kg and km when nothing is stored', () => {
    expect(loadUnitPrefs()).toEqual({ weight: 'kg', distance: 'km' })
  })

  it('reads stored lbs and mi', () => {
    store.set(KEY, JSON.stringify({ weight: 'lbs', distance: 'mi' }))
    expect(loadUnitPrefs()).toEqual({ weight: 'lbs', distance: 'mi' })
  })

  it('defaults a missing or unknown field', () => {
    store.set(KEY, JSON.stringify({ weight: 'stone' }))
    expect(loadUnitPrefs()).toEqual({ weight: 'kg', distance: 'km' })
  })

  it('falls back to kg and km when the stored value is not valid JSON', () => {
    store.set(KEY, '{oops')
    expect(loadUnitPrefs()).toEqual({ weight: 'kg', distance: 'km' })
  })

  it('falls back to kg and km when storage cannot be read', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
    })
    expect(loadUnitPrefs()).toEqual({ weight: 'kg', distance: 'km' })
  })
})

describe('saveUnitPrefs', () => {
  it('stores the units so the next load returns them', () => {
    expect(saveUnitPrefs({ weight: 'lbs', distance: 'km' })).toBe(true)
    expect(loadUnitPrefs()).toEqual({ weight: 'lbs', distance: 'km' })
  })

  it('reports a refused write and leaves the stored value as it was', () => {
    store.set(KEY, JSON.stringify({ weight: 'kg', distance: 'mi' }))
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: () => {
        throw new Error('quota')
      },
    })
    expect(saveUnitPrefs({ weight: 'lbs', distance: 'km' })).toBe(false)
    expect(loadUnitPrefs()).toEqual({ weight: 'kg', distance: 'mi' })
  })

  it('touches only its own key', () => {
    store.set('gym:sessions', '[{"id":"s1"}]')
    saveUnitPrefs({ weight: 'lbs', distance: 'mi' })
    expect(store.get('gym:sessions')).toBe('[{"id":"s1"}]')
  })
})
