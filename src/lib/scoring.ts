/**
 * Each guess is scored by how many times off it is: the ratio between the
 * guess and the answer, so 2× too high and 2× too low count the same.
 *
 *   factor = max(guess, answer) / min(guess, answer)      (1 = exact)
 *
 * Zero safety: if the guess or the answer is 0, both are shifted by +1 before
 * the ratio is taken, so there is never a division by zero and a guess of 0
 * for an answer of 0 is exact.
 */
export function offFactor(guess: number, answer: number): number {
  if (!Number.isFinite(guess) || !Number.isFinite(answer) || guess < 0 || answer < 0) {
    throw new RangeError('guess and answer must be finite, non-negative numbers')
  }
  let g = guess
  let a = answer
  if (g === 0 || a === 0) {
    g += 1
    a += 1
  }
  return Math.max(g, a) / Math.min(g, a)
}

export type Direction = 'exact' | 'high' | 'low'

export function direction(guess: number, answer: number): Direction {
  if (guess === answer) return 'exact'
  return guess > answer ? 'high' : 'low'
}

export type Compound = 'soft' | 'medium' | 'hard'

/** Tyre for one question: soft within 1.5×, medium within 3×, hard beyond. */
export function compoundFor(factor: number): Compound {
  if (factor <= 1.5) return 'soft'
  if (factor <= 3) return 'medium'
  return 'hard'
}

/** Band colours follow the usual soft/medium/hard convention. The emoji stand in for tyres in plain-text shares. */
export const COMPOUND = {
  soft: { label: 'Soft', color: '#e8202a', emoji: '🔴' },
  medium: { label: 'Medium', color: '#f5c400', emoji: '🟡' },
  hard: { label: 'Hard', color: '#f4f4f4', emoji: '⚪' },
} as const

export function formatFactor(f: number): string {
  if (f < 1.005) return '1.00×'
  return f < 10 ? `${f.toFixed(2)}×` : `${Math.round(f)}×`
}

/** Daily headline score: the plain average of the three times-off factors (lower is better, 1× is perfect). */
export function averageFactor(factors: number[]): number {
  if (factors.length === 0) return 1
  return factors.reduce((a, b) => a + b, 0) / factors.length
}

export type Finish = 'win' | 'podium' | 'points' | 'crash'

/** ≤2× race win, <5× podium, ≤10× points finish, anything worse is a crash. */
export function finishFor(avg: number): Finish {
  if (avg <= 2) return 'win'
  if (avg < 5) return 'podium'
  if (avg <= 10) return 'points'
  return 'crash'
}

/** Labels for each finish. The app draws its own icons (src/Icons.tsx); emoji are only for plain-text shares. */
export const FINISH = {
  win: { shareEmoji: '🏆', label: 'Race win' },
  podium: { shareEmoji: '🥇', label: 'Podium finish' },
  points: { shareEmoji: '👍', label: 'Points finish' },
  crash: { shareEmoji: '⚠️', label: 'Crashed out' },
} as const
