import { describe, expect, it } from 'vitest'
import { getExerciseMeta } from './metrics'
import { analyseProgress, filterRange, lastAndBest, progressSeries, splitLabel } from './progress'
import type { ProgressPoint } from './progress'
import type { WorkoutSession } from '../types'

const strength = getExerciseMeta({ category: 'strength', trackingType: 'reps' })
const sprint = getExerciseMeta({ category: 'calisthenics', trackingType: 'time', timeGoal: 'shorter' })

function session(date: string, name: string, sets: Array<Record<string, string>>): WorkoutSession {
  return {
    id: date,
    planId: 'p',
    planName: 'Plan',
    date,
    notes: '',
    exercises: [{ id: 'e', name, muscleGroup: '', sets: sets.map((s, i) => ({ id: String(i), weight: '', reps: '', ...s })) }],
  }
}

const pts = (...rows: Array<[string, number]>): ProgressPoint[] =>
  rows.map(([date, value]) => ({ date, value, label: String(value) }))

describe('progressSeries', () => {
  it('keeps sessions with a value for the exercise, oldest first', () => {
    const sessions = [
      session('2026-05-04', 'Row', [{ weight: '40', reps: '12' }]),
      session('2026-04-01', 'Row', [{ weight: '50', reps: '10' }, { weight: '30', reps: '10' }]),
      session('2026-04-20', 'Row', [{ weight: '', reps: '' }]),
      session('2026-04-21', 'Squat', [{ weight: '100', reps: '5' }]),
    ]
    const series = progressSeries(sessions, 'Row', strength, 'peak')
    expect(series.map((p) => [p.date, p.value, p.label])).toEqual([
      ['2026-04-01', 50, '50kg × 10'],
      ['2026-05-04', 40, '40kg × 12'],
    ])
  })
})

describe('filterRange', () => {
  const series = pts(
    ['2026-01-01', 1], ['2026-08-20', 2], ['2026-08-22', 3], ['2026-09-01', 4], ['2026-10-21', 5],
    ['2026-10-22', 6], ['2026-11-01', 7],
  )

  it('keeps the last 5 or 10 sessions', () => {
    expect(filterRange(series, '5', '2026-11-22').map((p) => p.value)).toEqual([3, 4, 5, 6, 7])
    expect(filterRange(series, '10', '2026-11-22')).toHaveLength(7)
  })

  it('keeps sessions on or after the same date one or three months ago', () => {
    expect(filterRange(series, '1m', '2026-11-22').map((p) => p.value)).toEqual([6, 7])
    expect(filterRange(series, '3m', '2026-11-22').map((p) => p.value)).toEqual([3, 4, 5, 6, 7])
  })

  it('returns nothing for a calendar range with no sessions in it', () => {
    expect(filterRange(pts(['2025-01-01', 1]), '1m', '2026-11-22')).toEqual([])
  })
})

describe('lastAndBest', () => {
  it('returns the latest point and the first point to reach the highest value', () => {
    const result = lastAndBest(pts(['2026-01-01', 50], ['2026-02-01', 57], ['2026-03-01', 57], ['2026-04-01', 40]), true)
    expect(result?.last.date).toBe('2026-04-01')
    expect(result?.best.date).toBe('2026-02-01')
  })

  it('takes the lowest value when lower is better', () => {
    const result = lastAndBest(pts(['2026-01-01', 90], ['2026-02-01', 75], ['2026-03-01', 80]), false)
    expect(result?.best.value).toBe(75)
  })

  it('is null without points', () => {
    expect(lastAndBest([], true)).toBeNull()
  })

  it('matches stored sessions for a shorter-is-better time exercise', () => {
    const sessions = [
      session('2026-03-01', 'Sprint', [{ duration: '40' }]),
      session('2026-03-08', 'Sprint', [{ duration: '35' }]),
      session('2026-03-15', 'Sprint', [{ duration: '38' }]),
    ]
    const result = lastAndBest(progressSeries(sessions, 'Sprint', sprint, 'peak'), false)
    expect(result?.best.label).toBe('00:35')
    expect(result?.last.label).toBe('00:38')
  })
})

describe('analyseProgress', () => {
  it('counts improvements, stagnations and the change since the first session', () => {
    // b and e beat the session before; d beats neither of the two before it
    const result = analyseProgress(pts(['a', 10], ['b', 12], ['c', 12], ['d', 11], ['e', 13]), true)
    expect(result).toEqual({ total: 5, improvements: 2, stagnations: 1, delta: 3 })
  })

  it('follows the direction when lower is better', () => {
    expect(analyseProgress(pts(['a', 40], ['b', 35]), false).improvements).toBe(1)
  })
})

describe('splitLabel', () => {
  it.each([
    ['40kg × 12', '40', 'kg × 12'],
    ['40.0 kg/rep', '40.0', 'kg/rep'],
    ['14 reps (+15kg)', '14', 'reps (+15kg)'],
    ['01:30', '01:30', ''],
    ['5.00 km', '5.00', 'km'],
  ])('%s', (label, figure, unit) => {
    expect(splitLabel(label)).toEqual({ figure, unit })
  })
})
