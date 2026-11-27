import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_TIMER_PREFS, loadTimerPrefs, saveTimerPrefs } from './timerPrefs'

const KEY = 'gym:timerPrefs'
let store: Map<string, string>

beforeEach(() => {
  store = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  })
})

describe('rest lengths and rest after holds', () => {
  it('defaults to 1:00, 0:30 and 0:15 with a rest after holds', () => {
    expect(loadTimerPrefs()).toMatchObject({ restSec: { strength: 60, calisthenics: 30, cardio: 15 }, restAfterHolds: true })
  })

  it('keeps stored values and defaults anything that is not a whole positive number of seconds', () => {
    store.set(KEY, JSON.stringify({ restSec: { strength: 100, calisthenics: 0, cardio: '20' }, restAfterHolds: false }))
    expect(loadTimerPrefs()).toMatchObject({ restSec: { strength: 100, calisthenics: 30, cardio: 15 }, restAfterHolds: false })
  })

  it('stores the choices so the next load returns them', () => {
    const prefs = { ...DEFAULT_TIMER_PREFS, soundEnabled: false, restSec: { strength: 90, calisthenics: 45, cardio: 20 } }
    expect(saveTimerPrefs(prefs)).toBe(true)
    expect(loadTimerPrefs()).toEqual(prefs)
  })

  it('reports a refused write', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('full')
      },
    })
    expect(saveTimerPrefs(DEFAULT_TIMER_PREFS)).toBe(false)
  })
})
