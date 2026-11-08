import { DIFFICULTIES, type Question } from './types'
import type { Progress } from './storage'

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
 * Each day serves one easy, one medium and one hard question, in that order.
 * Each difficulty pool is sorted by id (so file order does not matter), then
 * shuffled once per "cycle" with a seed derived from the cycle and the
 * difficulty. A cycle lasts as many days as the smallest pool has questions,
 * so no question repeats within a cycle.
 */
export function questionsForPuzzle(n: number, bank: Question[]): Question[] {
  if (n < 1) throw new RangeError('Puzzle numbers start at 1')
  const pools = DIFFICULTIES.map((d) => bank.filter((q) => q.difficulty === d).sort((a, b) => a.id.localeCompare(b.id)))
  const daysPerCycle = Math.min(...pools.map((p) => p.length))
  if (daysPerCycle < 1) throw new Error('Need at least one easy, one medium and one hard question')
  const cycle = Math.floor((n - 1) / daysPerCycle)
  const slot = (n - 1) % daysPerCycle
  return pools.map((pool, i) => seededShuffle(pool, (0x9e3779b1 ^ (cycle + 1)) + i * 7919)[slot])
}

/** Prefer the questions a player originally saw, so adding questions later never rewrites past results. */
export function questionsFor(n: number, bank: Question[], progress: Progress): Question[] {
  const ids = progress.puzzles[String(n)]?.questionIds
  if (ids?.length) {
    const byId = new Map(bank.map((q) => [q.id, q]))
    const kept = ids.map((id) => byId.get(id))
    if (kept.every(Boolean)) return kept as Question[]
  }
  return questionsForPuzzle(n, bank)
}

