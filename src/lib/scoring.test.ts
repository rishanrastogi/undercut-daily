import { describe, expect, it } from 'vitest'
import { averageFactor, direction, finishFor, offFactor } from './scoring'

describe('times off', () => {
  it('is 1 for an exact guess', () => {
    expect(offFactor(575, 575)).toBe(1)
  })

  it('treats over- and under-guesses symmetrically', () => {
    expect(offFactor(200, 100)).toBe(2)
    expect(offFactor(50, 100)).toBe(2)
  })

  it('handles zero answers and zero guesses without dividing by zero', () => {
    expect(offFactor(0, 0)).toBe(1)
    expect(offFactor(9, 0)).toBe(10)
    expect(offFactor(0, 9)).toBe(10)
    expect(Number.isFinite(offFactor(0, 50))).toBe(true)
  })

  it('rejects invalid input', () => {
    expect(() => offFactor(-1, 10)).toThrow(RangeError)
    expect(() => offFactor(Number.NaN, 10)).toThrow(RangeError)
  })

  it('reports direction', () => {
    expect(direction(5, 5)).toBe('exact')
    expect(direction(6, 5)).toBe('high')
    expect(direction(4, 5)).toBe('low')
  })
})

describe('daily average and finish', () => {
  it('averages factors', () => {
    expect(averageFactor([3.4, 1.09, 1.63])).toBeCloseTo(2.04, 2)
    expect(averageFactor([])).toBe(1)
  })

  it('maps the average to a finish at the documented boundaries', () => {
    expect(finishFor(1)).toBe('win')
    expect(finishFor(2)).toBe('win')
    expect(finishFor(2.01)).toBe('podium')
    expect(finishFor(4.99)).toBe('podium')
    expect(finishFor(5)).toBe('points')
    expect(finishFor(10)).toBe('points')
    expect(finishFor(10.01)).toBe('crash')
  })
})
