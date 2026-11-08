import { FINISH, finishFor, formatFactor, TIER_EMOJI, tier } from './scoring'

/** Spoiler-free: puzzle number, average times-off, finish icon and one tile per question. No guesses or answers. */
export function shareText(puzzle: number, avgFactor: number, points: number[], url: string): string {
  const grid = points.map((p) => TIER_EMOJI[tier(p)]).join('')
  return `Undercut #${puzzle} · ${formatFactor(avgFactor)} ${FINISH[finishFor(avgFactor)].icon}\n${grid}\n${url}`
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

export async function copyText(text: string): Promise<ShareResult> {
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}

/** Uses the Web Share API when the browser has it, otherwise falls back to the clipboard. */
export async function shareResult(text: string): Promise<ShareResult> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ text })
      return 'shared'
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancelled'
    }
  }
  return copyText(text)
}
