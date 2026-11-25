import { describe, expect, it } from 'vitest'
import type { Set } from '../types'
import {
  convertDistance,
  distanceText,
  setFromDisplay,
  setToDisplay,
  setsInUnits,
  storedDistance,
  storedWeight,
  trimNumber,
  weightLabel,
  weightStep,
  weightText,
} from './units'

const lbs = { weight: 'lbs', distance: 'km' } as const
const mi = { weight: 'kg', distance: 'mi' } as const
const kgKm = { weight: 'kg', distance: 'km' } as const

describe('weight', () => {
  it('shows stored 100 kg as 220.5 lb and keeps kg values as they are', () => {
    expect(weightText('100', 'lbs')).toBe('220.5')
    expect(weightText('100', 'kg')).toBe('100')
    expect(weightText('62.5', 'kg')).toBe('62.5')
  })

  it('stores 135 lb at full precision and shows it as 135 again', () => {
    const kg = storedWeight('135', 'lbs')
    expect(Number(kg)).toBeCloseTo(61.23496995, 8)
    expect(weightText(kg, 'lbs')).toBe('135')
  })

  it('reads back every half pound up to 1000 lb without drift', () => {
    for (let lb = 0; lb <= 1000; lb += 0.5) {
      expect(weightText(storedWeight(String(lb), 'lbs'), 'lbs')).toBe(trimNumber(lb, 1))
    }
  })

  it('keeps kg typing untouched and passes blank or unreadable text through', () => {
    expect(storedWeight('62.', 'kg')).toBe('62.')
    expect(storedWeight('', 'lbs')).toBe('')
    expect(weightText('', 'lbs')).toBe('')
    expect(weightText('abc', 'lbs')).toBe('abc')
  })

  it('never shows tiny values as exponents or negative zero', () => {
    expect(trimNumber(1e-7, 1)).toBe('0')
    expect(trimNumber(-0.01, 1)).toBe('0')
    expect(weightText('9999.9', 'kg')).toBe('9999.9')
  })

  it('labels lb and steps 5 lb or 2.5 kg', () => {
    expect(weightLabel('lbs')).toBe('lb')
    expect(weightLabel('kg')).toBe('kg')
    expect(weightStep('lbs')).toBe(5)
    expect(weightStep('kg')).toBe(2.5)
  })
})

describe('distance', () => {
  it('shows km-stored 5 as 3.11 mi and mi-stored 3.1 as 4.99 km', () => {
    expect(distanceText('5', 'km', 'mi')).toBe('3.11')
    expect(distanceText('3.1', 'mi', 'km')).toBe('4.99')
    expect(distanceText('5', 'km', 'km')).toBe('5')
  })

  it('stores a distance typed in mi in the exercise unit, unrounded', () => {
    expect(storedDistance('3.1', 'mi', 'mi')).toBe('3.1')
    const km = storedDistance('3.1', 'mi', 'km')
    expect(Number(km)).toBeCloseTo(4.9889664, 7)
    expect(distanceText(km, 'km', 'mi')).toBe('3.1')
    expect(convertDistance(convertDistance(10, 'km', 'mi'), 'mi', 'km')).toBeCloseTo(10, 12)
  })
})

describe('editing a set', () => {
  const set: Set = { id: 's', weight: '61.23497', reps: '8', distance: '5' }

  it('leaves untouched fields at their stored value', () => {
    for (const prefs of [lbs, mi, kgKm]) {
      const shown = setToDisplay(set, prefs, 'km')
      expect(setFromDisplay(shown, set, prefs, 'km')).toEqual(set)
    }
  })

  it('converts the field that was changed', () => {
    const shown = setToDisplay(set, lbs, 'km')
    expect(shown.weight).toBe('135')
    const saved = setFromDisplay({ ...shown, weight: '140' }, set, lbs, 'km')
    expect(Number(saved.weight)).toBeCloseTo(63.5029318, 6)
    expect(saved.distance).toBe('5')
  })

  it('converts a changed distance back to the exercise unit', () => {
    const shown = setToDisplay(set, mi, 'km')
    expect(shown.distance).toBe('3.11')
    const saved = setFromDisplay({ ...shown, distance: '4' }, set, mi, 'km')
    expect(Number(saved.distance)).toBeCloseTo(6.437376, 6)
  })
})

describe('setsInUnits', () => {
  const sets: Set[] = [{ id: 'a', weight: '100', reps: '5', distance: '5' }]

  it('returns the same sets when nothing needs converting', () => {
    expect(setsInUnits(sets, 'kg', 'km', 'km')).toBe(sets)
  })

  it('converts weight and distance without rounding', () => {
    const [s] = setsInUnits(sets, 'lbs', 'mi', 'km')
    expect(Number(s.weight)).toBeCloseTo(220.4622622, 6)
    expect(Number(s.distance)).toBeCloseTo(3.1068560, 6)
    expect(s.reps).toBe('5')
  })

  it('does not touch the stored sets', () => {
    setsInUnits(sets, 'lbs', 'mi', 'km')
    expect(sets[0]).toEqual({ id: 'a', weight: '100', reps: '5', distance: '5' })
  })
})
