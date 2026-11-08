import type { Finish } from './lib/scoring'

/** Original monochrome icons drawn in currentColor, so they follow the light/dark theme. */
type IconProps = { size?: number; className?: string }

const base = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 48 48',
  className: className ? `icon ${className}` : 'icon',
  'aria-hidden': true as const,
  focusable: false as const,
})

export function TrophyIcon({ size = 48, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M14 7h20v11a10 10 0 0 1-20 0Z" fill="currentColor" />
      <path d="M14 11H9.5a4.5 4.5 0 0 0 5 8.5M34 11h4.5a4.5 4.5 0 0 1-5 8.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <rect x="21" y="27" width="6" height="7" fill="currentColor" />
      <rect x="14" y="34" width="20" height="6" rx="2" fill="currentColor" />
    </svg>
  )
}

export function MedalIcon({ size = 48, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 4h8l6 14h-8ZM36 4h-8l-6 14h8Z" fill="currentColor" />
      <circle cx="24" cy="31" r="12" fill="none" stroke="currentColor" strokeWidth="3.5" />
      <polygon
        points="24,24.5 25.9,28.6 30.3,29 27,32 28,36.4 24,34.1 20,36.4 21,32 17.7,29 22.1,28.6"
        fill="currentColor"
      />
    </svg>
  )
}

export function ThumbsUpIcon({ size = 48, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="6" y="21" width="7" height="20" rx="1.5" fill="currentColor" />
      <path
        d="M16 21 23.5 8.5a3.2 3.2 0 0 1 5.9 2.2L28 19h9.5a3.6 3.6 0 0 1 3.5 4.4l-3.1 13.2A3.6 3.6 0 0 1 34.4 39H16Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function WarningIcon({ size = 48, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M24 6 44 41H4Z" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M24 18v11" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="24" cy="35" r="2.4" fill="currentColor" />
    </svg>
  )
}

export function FlagIcon({ size = 48, className }: IconProps) {
  const cols = 4
  const rows = 3
  const w = 26 / cols
  const h = 18 / rows
  return (
    <svg {...base(size, className)}>
      <path d="M10 5v38" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <rect x="12" y="7" width="26" height="18" fill="none" stroke="currentColor" strokeWidth="2" />
      {Array.from({ length: rows * cols }, (_, i) => {
        const r = Math.floor(i / cols)
        const c = i % cols
        return (r + c) % 2 === 0 ? <rect key={i} x={12 + c * w} y={7 + r * h} width={w} height={h} fill="currentColor" /> : null
      })}
    </svg>
  )
}

const FINISH_ICON: Record<Finish, (p: IconProps) => React.JSX.Element> = {
  win: TrophyIcon,
  podium: MedalIcon,
  points: ThumbsUpIcon,
  crash: WarningIcon,
}

export function FinishIcon({ finish, size, className }: IconProps & { finish: Finish }) {
  const Icon = FINISH_ICON[finish]
  return <Icon size={size} className={className} />
}
