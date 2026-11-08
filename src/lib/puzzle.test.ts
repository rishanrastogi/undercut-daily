import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { dateForPuzzle, LAUNCH_DATE, puzzleNumberFor, questionsForPuzzle } from './puzzle'
import type { Question } from './types'

const bank: Question[] = JSON.parse(readFileSync(resolve(__dirname, '../../public/questions.json'), 'utf8'))

describe('puzzle numbering', () => {
  it('launch day is puzzle #1 regardless of time of day (UTC)', () => {
    expect(puzzleNumberFor(new Date(`${LAUNCH_DATE}T00:00:00Z`))).toBe(1)
    expect(puzzleNumberFor(new Date(`${LAUNCH_DATE}T23:59:59Z`))).toBe(1)
  })

  it('advances one per UTC day', () => {
    expect(puzzleNumberFor(new Date('2026-11-09T00:00:00Z'))).toBe(2)
    expect(puzzleNumberFor(new Date('2027-11-08T12:00:00Z'))).toBe(366)
  })

  it('round-trips dates', () => {
    for (const n of [1, 2, 50, 400]) {
      expect(puzzleNumberFor(new Date(`${dateForPuzzle(n)}T12:00:00Z`))).toBe(n)
    }
  })
})

describe('question selection', () => {
  it('is deterministic for a given puzzle number', () => {
    const a = questionsForPuzzle(7, bank).map((q) => q.id)
    const b = questionsForPuzzle(7, bank).map((q) => q.id)
    expect(a).toEqual(b)
    expect(a).toHaveLength(3)
  })

  it('does not depend on file order', () => {
    const reversed = bank.slice().reverse()
    expect(questionsForPuzzle(3, reversed).map((q) => q.id)).toEqual(questionsForPuzzle(3, bank).map((q) => q.id))
  })

  it('never repeats a question within a cycle', () => {
    const days = Math.floor(bank.length / 3)
    for (const cycle of [0, 1, 5]) {
      const ids = Array.from({ length: days }, (_, i) => questionsForPuzzle(cycle * days + i + 1, bank))
        .flat()
        .map((q) => q.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('rejects invalid puzzle numbers', () => {
    expect(() => questionsForPuzzle(0, bank)).toThrow()
  })
})
