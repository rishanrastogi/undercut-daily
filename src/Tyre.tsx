import { TYRE } from './lib/scoring'
import type { Difficulty } from './lib/types'

/** Original side-on tyre drawing: black rubber, coloured compound band, silver rim. No brand marks. */
export function Tyre({ difficulty, size = 28 }: { difficulty: Difficulty; size?: number }) {
  const { label, difficulty: name, color } = TYRE[difficulty]
  return (
    <svg className="tyre" width={size} height={size} viewBox="0 0 32 32" role="img" aria-label={`${label} tyre: ${name.toLowerCase()} question`}>
      <title>{`${label} tyre: ${name.toLowerCase()} question`}</title>
      <circle cx="16" cy="16" r="15" fill="#151515" stroke="#3d3d3d" strokeWidth="1" />
      <circle cx="16" cy="16" r="11.4" fill="none" stroke={color} strokeWidth="3" />
      <circle cx="16" cy="16" r="8.2" fill="#2a2a2a" />
      <circle cx="16" cy="16" r="6.6" fill="#9a9a9a" />
      <circle cx="16" cy="16" r="2" fill="#2a2a2a" />
      {[0, 72, 144, 216, 288].map((a) => (
        <line key={a} x1="16" y1="16" x2="16" y2="10.4" stroke="#2a2a2a" strokeWidth="1.4" transform={`rotate(${a} 16 16)`} />
      ))}
    </svg>
  )
}
