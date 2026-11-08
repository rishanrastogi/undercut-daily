import type { MouseEvent, ReactNode } from 'react'
import { href, navigate } from './router'

/** In-app link that respects the Pages base path and keeps modifier-clicks working. */
export function Link({ to, children, className, ...rest }: { to: string; children: ReactNode; className?: string; 'aria-label'?: string }) {
  const onClick = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    navigate(to)
  }
  return (
    <a href={href(to)} onClick={onClick} className={className} {...rest}>
      {children}
    </a>
  )
}
