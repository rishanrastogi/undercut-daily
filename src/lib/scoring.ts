/**
 * Scoring is based on how many times off a guess is (the ratio between the
 * guess and the answer), measured on a log scale so 2× too high and 2× too
 * low cost the same.
 *
 *   factor = max(guess, answer) / min(guess, answer)      (1 = exact)
 *   points = 100 − 100 × log10(factor), floored at 0
 *
 * So 1.1× off ≈ 96, 1.5× ≈ 82, 2× ≈ 70, 5× ≈ 30, 10× or worse = 0.
 *
 * Zero safety: if the guess or the answer is 0, both are shifted by +1 before
 * the ratio is taken, so there is never a division by zero and a guess of 0
 * for an answer of 0 is a perfect score.
 */
export const MAX_POINTS = 100

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

export function scoreGuess(guess: number, answer: number): number {
  const factor = offFactor(guess, answer)
  const raw = MAX_POINTS - MAX_POINTS * Math.log10(factor)
  return Math.max(0, Math.round(raw))
}

export type Direction = 'exact' | 'high' | 'low'

export function direction(guess: number, answer: number): Direction {
  if (guess === answer) return 'exact'
  return guess > answer ? 'high' : 'low'
}

export function tier(points: number): 0 | 1 | 2 | 3 {
  if (points >= 90) return 3
  if (points >= 70) return 2
  if (points >= 40) return 1
  return 0
}

export const TIER_EMOJI = ['🟥', '🟧', '🟨', '🟩'] as const
export const TIER_LABEL = ['Off the pace', 'In the points', 'Podium', 'Pole position'] as const

export function formatFactor(f: number): string {
  if (f < 1.005) return '1.00×'
  return f < 10 ? `${f.toFixed(2)}×` : `${Math.round(f)}×`
}
