import { describe, expect, it } from 'vitest'
import { availableMetrics, computeMetric, getExerciseMeta, metricInfo, resolveBranch, type MetricBranch } from './metrics'
import type { Set } from '../types'

const strength = getExerciseMeta({
  category: 'strength',
  trackingType: 'reps',
  trackWeight: true,
  trackDistance: false,
  timeGoal: 'longer',
  distanceUnit: 'km',
})

const sets = (rows: Array<Partial<Set>>) => rows as Set[]

describe('resolveBranch', () => {
  it('treats rep-tracked strength as strength', () => {
    expect(resolveBranch(strength)).toBe('strength')
  })

  it('treats strength without weight as reps, so its sets never chart as 0 kg', () => {
    expect(resolveBranch({ ...strength, trackWeight: false })).toBe('reps')
  })

  it('treats a time-tracked strength exercise as time', () => {
    expect(resolveBranch({ ...strength, trackingType: 'time' })).toBe('time')
  })

  it('treats distance-tracked time exercises as distance', () => {
    expect(resolveBranch({ ...strength, trackingType: 'time', trackDistance: true })).toBe('distance')
  })
})

describe('computeMetric (strength)', () => {
  const data = sets([
    { weight: '100', reps: '10' },
    { weight: '80', reps: '5' },
  ])

  it('computes total volume', () => {
    expect(computeMetric(data, strength, 'total')?.value).toBe(1400)
  })

  it('computes the peak set by weight x reps', () => {
    const peak = computeMetric(data, strength, 'peak')
    expect(peak?.value).toBe(100)
    expect(peak?.label).toBe('100kg × 10')
  })

  it('estimates 1RM with the Epley formula', () => {
    expect(computeMetric(data, strength, 'e1rm')?.value).toBeCloseTo(100 * (1 + 10 / 30))
  })

  it('returns null when no set has weight and reps', () => {
    expect(computeMetric(sets([{ weight: '', reps: '' }]), strength, 'average')).toBeNull()
  })
})

describe('getExerciseMeta distance unit', () => {
  it('uses km when the exercise stores no unit, as new plans do', () => {
    expect(getExerciseMeta({ category: 'cardio' }).distanceUnit).toBe('km')
  })

  it('keeps a stored mi, so distances already logged in miles are not relabelled', () => {
    expect(getExerciseMeta({ category: 'cardio', distanceUnit: 'mi' }).distanceUnit).toBe('mi')
  })
})

describe('metricInfo', () => {
  const branches: MetricBranch[] = ['strength', 'reps', 'time', 'distance']

  it('explains every metric each kind of exercise offers', () => {
    for (const branch of branches) {
      for (const metric of availableMetrics(branch)) {
        expect(metricInfo(branch, metric, 'longer'), `${branch} ${metric}`).not.toBe('')
      }
    }
  })

  it('names the Epley estimate for e1RM', () => {
    expect(metricInfo('strength', 'e1rm', 'longer')).toMatch(/Epley/)
  })

  it('follows the exercise goal for the peak of a timed set', () => {
    expect(metricInfo('time', 'peak', 'longer')).toBe('Your longest set.')
    expect(metricInfo('time', 'peak', 'shorter')).toBe('Your shortest set.')
  })

  it('never mentions weight for exercises charted without it', () => {
    for (const branch of ['reps', 'time', 'distance'] as const) {
      for (const metric of availableMetrics(branch)) {
        expect(metricInfo(branch, metric, 'longer')).not.toMatch(/weight/i)
      }
    }
  })
})
