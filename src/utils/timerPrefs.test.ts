import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadTimerPrefs } from './timerPrefs'

const KEY = 'gym:timerPrefs'
let store: Map<string, string>

beforeEach(() => {
  store = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  })
})

function cues() {
  const { soundEnabled, vibrationEnabled } = loadTimerPrefs()
  return { soundEnabled, vibrationEnabled }
}

describe('loadTimerPrefs', () => {
  it('turns sound and vibration on when nothing is stored', () => {
    expect(cues()).toEqual({ soundEnabled: true, vibrationEnabled: true })
  })

  it('keeps a stored opt-out and defaults a missing field to on', () => {
    store.set(KEY, JSON.stringify({ soundEnabled: false }))
    expect(cues()).toEqual({ soundEnabled: false, vibrationEnabled: true })
  })

  it('reads older stored prefs that still carry custom presets', () => {
    store.set(KEY, JSON.stringify({ soundEnabled: true, vibrationEnabled: false, customPresets: { 'cardio-work': [45] } }))
    expect(cues()).toEqual({ soundEnabled: true, vibrationEnabled: false })
  })

  it('falls back to both on when the stored value is not valid JSON', () => {
    store.set(KEY, '{oops')
    expect(cues()).toEqual({ soundEnabled: true, vibrationEnabled: true })
  })

  it('falls back to both on when storage cannot be read', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new DOMException('denied', 'SecurityError')
      },
    })
    expect(cues()).toEqual({ soundEnabled: true, vibrationEnabled: true })
  })
})
