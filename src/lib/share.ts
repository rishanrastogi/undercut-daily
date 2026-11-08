import { FINISH, finishFor, formatFactor } from './scoring'

/** Spoiler-free: puzzle number, average times-off, finish icon and one finish emoji per question. No guesses or answers. */
export function shareText(puzzle: number, avgFactor: number, factors: number[], url: string): string {
  const grid = factors.map((f) => FINISH[finishFor(f)].shareEmoji).join('')
  return `Undercut #${puzzle} · ${formatFactor(avgFactor)} ${FINISH[finishFor(avgFactor)].shareEmoji}\n${grid}\n${url}`
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
