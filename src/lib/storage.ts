/** Per-browser progress. Guesses are write-once: a saved guess is never overwritten. */
export interface PuzzleRecord {
  /** questionId -> guess */
  guesses: Record<string, number>
  questionIds: string[]
  completedAt?: string
}

export interface Progress {
  version: 1
  puzzles: Record<string, PuzzleRecord>
  seenHelp: boolean
}

const KEY = 'undercut:v1'

export function emptyProgress(): Progress {
  return { version: 1, puzzles: {}, seenHelp: false }
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyProgress()
    const parsed = JSON.parse(raw) as Progress
    if (parsed?.version !== 1 || typeof parsed.puzzles !== 'object') return emptyProgress()
    return parsed
  } catch {
    return emptyProgress()
  }
}

export function saveProgress(p: Progress): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
    return true
  } catch {
    return false
  }
}

/** Returns a new Progress with the guess recorded, unless one already exists. */
export function recordGuess(
  p: Progress,
  puzzle: number,
  questionIds: string[],
  questionId: string,
  guess: number,
): Progress {
  const key = String(puzzle)
  const rec = p.puzzles[key] ?? { guesses: {}, questionIds }
  if (questionId in rec.guesses) return p
  const guesses = { ...rec.guesses, [questionId]: guess }
  const done = questionIds.every((id) => id in guesses)
  return {
    ...p,
    puzzles: {
      ...p.puzzles,
      [key]: { ...rec, guesses, completedAt: done ? new Date().toISOString() : rec.completedAt },
    },
  }
}

/** Current streak: consecutive completed puzzles ending today (or yesterday if today is not done yet). */
export function streaks(p: Progress, today: number): { current: number; best: number; played: number } {
  const done = new Set(
    Object.entries(p.puzzles)
      .filter(([, r]) => r.completedAt)
      .map(([k]) => Number(k)),
  )
  let current = 0
  let n = done.has(today) ? today : today - 1
  while (done.has(n)) {
    current++
    n--
  }
  let best = 0
  let run = 0
  const sorted = [...done].sort((a, b) => a - b)
  sorted.forEach((v, i) => {
    run = i > 0 && sorted[i - 1] === v - 1 ? run + 1 : 1
    best = Math.max(best, run)
  })
  return { current, best, played: done.size }
}
