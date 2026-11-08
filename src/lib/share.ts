import { TIER_EMOJI, tier } from './scoring'

export function shareText(puzzle: number, points: number[], url: string): string {
  const total = points.reduce((a, b) => a + b, 0)
  const grid = points.map((p) => TIER_EMOJI[tier(p)]).join('')
  return `Undercut #${puzzle} · ${total}/${points.length * 100}\n${grid}\n${url}`
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

export async function shareResult(text: string): Promise<ShareResult> {
  if (typeof navigator !== 'undefined' && navigator.share && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ text })
      return 'shared'
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancelled'
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}
