import type { Question } from './types'

/** Puzzle #1 is this UTC date. Every player worldwide gets the same puzzle per UTC day. */
export const LAUNCH_DATE = '2026-11-08'
export const QUESTIONS_PER_DAY = 3
const DAY_MS = 86_400_000

function utcMidnight(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function todayUtcIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/** 1-based puzzle number for a date. Dates before launch return values < 1. */
export function puzzleNumberFor(now: Date = new Date()): number {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.floor((today - utcMidnight(LAUNCH_DATE)) / DAY_MS) + 1
}

export function dateForPuzzle(n: number): string {
  return new Date(utcMidnight(LAUNCH_DATE) + (n - 1) * DAY_MS).toISOString().slice(0, 10)
}

/** Small deterministic PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = items.slice()
  const rand = mulberry32(seed)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Questions are sorted by id (so file order does not matter), then shuffled
 * once per "cycle" with a seed derived from the cycle number. Each day takes
 * the next three questions from the current cycle, so no question repeats
 * within a cycle and a day never mixes two cycles.
 */
export function questionsForPuzzle(n: number, bank: Question[]): Question[] {
  if (n < 1) throw new RangeError('Puzzle numbers start at 1')
  const daysPerCycle = Math.floor(bank.length / QUESTIONS_PER_DAY)
  if (daysPerCycle < 1) throw new Error(`Need at least ${QUESTIONS_PER_DAY} questions`)
  const sorted = bank.slice().sort((a, b) => a.id.localeCompare(b.id))
  const cycle = Math.floor((n - 1) / daysPerCycle)
  const slot = (n - 1) % daysPerCycle
  const order = seededShuffle(sorted, 0x9e3779b1 ^ (cycle + 1))
  return order.slice(slot * QUESTIONS_PER_DAY, slot * QUESTIONS_PER_DAY + QUESTIONS_PER_DAY)
}
