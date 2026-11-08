import { describe, expect, it } from 'vitest'
import { averageFactor, direction, finishFor, offFactor, scoreGuess, tier } from './scoring'

describe('scoring', () => {
  it('gives 100 for an exact guess', () => {
    expect(scoreGuess(575, 575)).toBe(100)
  })

  it('penalises over- and under-guesses symmetrically', () => {
    expect(scoreGuess(200, 100)).toBe(scoreGuess(50, 100))
    expect(scoreGuess(200, 100)).toBe(70)
  })

  it('floors at 0 for 10× or worse', () => {
    expect(scoreGuess(1000, 100)).toBe(0)
    expect(scoreGuess(1, 1_000_000)).toBe(0)
  })

  it('handles zero answers and zero guesses without dividing by zero', () => {
    expect(scoreGuess(0, 0)).toBe(100)
    expect(offFactor(0, 0)).toBe(1)
    expect(offFactor(9, 0)).toBe(10)
    expect(scoreGuess(9, 0)).toBe(0)
    expect(Number.isFinite(scoreGuess(0, 50))).toBe(true)
    expect(scoreGuess(0, 50)).toBeGreaterThanOrEqual(0)
  })

  it('rejects invalid input', () => {
    expect(() => scoreGuess(-1, 10)).toThrow(RangeError)
    expect(() => scoreGuess(Number.NaN, 10)).toThrow(RangeError)
  })

  it('maps points to tiers at documented thresholds', () => {
    expect(tier(100)).toBe(3)
    expect(tier(90)).toBe(3)
    expect(tier(89)).toBe(2)
    expect(tier(70)).toBe(2)
    expect(tier(40)).toBe(1)
    expect(tier(39)).toBe(0)
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
