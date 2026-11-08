import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateQuestions } from './validate'
import { emptyProgress, recordGuess, streaks } from './storage'
import { shareText } from './share'

const bank = JSON.parse(readFileSync(resolve(__dirname, '../../public/questions.json'), 'utf8'))
const good = bank[0]

describe('content validation', () => {
  it('accepts the shipped question bank', () => {
    expect(validateQuestions(bank)).toEqual([])
  })

  it('flags missing fields, bad dates, non-numeric answers and bad sources', () => {
    const bad = [
      good,
      { ...good, id: 'a', answer: '12' },
      { ...good, id: 'b', sourceDate: '2024-02-30' },
      { ...good, id: 'c', sourceUrl: 'not a url' },
      { ...good, id: 'd', definition: '' },
      { ...good, id: 'e', sourceType: 'guess' },
      { ...good, id: 'f', sourceDate: '2999-01-01' },
    ]
    const errs = validateQuestions(bad).join('\n')
    expect(errs).toMatch(/a\).*answer/)
    expect(errs).toMatch(/b\).*sourceDate/)
    expect(errs).toMatch(/c\).*sourceUrl/)
    expect(errs).toMatch(/d\).*definition/)
    expect(errs).toMatch(/e\).*sourceType/)
    expect(errs).toMatch(/f\).*future/)
  })

  it('flags duplicate ids', () => {
    expect(validateQuestions([good, good, { ...good, id: 'x' }]).join()).toMatch(/duplicate/)
  })
})

describe('progress', () => {
  it('never overwrites a recorded guess', () => {
    let p = recordGuess(emptyProgress(), 1, ['a', 'b', 'c'], 'a', 10)
    p = recordGuess(p, 1, ['a', 'b', 'c'], 'a', 99)
    expect(p.puzzles['1'].guesses.a).toBe(10)
  })

  it('marks completion and computes streaks', () => {
    let p = emptyProgress()
    for (const n of [1, 2, 3, 5]) for (const id of ['a', 'b', 'c']) p = recordGuess(p, n, ['a', 'b', 'c'], id, 1)
    expect(streaks(p, 5)).toEqual({ current: 1, best: 3, played: 4 })
    expect(streaks(p, 6).current).toBe(1)
    expect(streaks(p, 7).current).toBe(0)
  })
})

describe('share text', () => {
  it('is spoiler-free: no guesses or answers, just the average, finish and tiles', () => {
    const t = shareText(4, 1.82, [1.1, 1.8, 12], 'https://example.com/')
    expect(t).toBe('Undercut #4 · 1.82× 🏆\n🔴🟡⚪\nhttps://example.com/')
  })
})
