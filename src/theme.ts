import { useCallback, useState } from 'react'

export type Theme = 'dark' | 'light'

const KEY = 'undercut:theme'
const BG: Record<Theme, string> = { dark: '#0a0a0a', light: '#ffffff' }

function apply(theme: Theme) {
  const root = document.documentElement
  if (theme === 'light') root.dataset.theme = 'light'
  else delete root.dataset.theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BG[theme])
}

/** Dark by default. The choice is remembered per browser; if storage is blocked it still works for the visit. */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'))
  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      apply(next)
      try {
        localStorage.setItem(KEY, next)
      } catch {
        // Storage blocked: the theme still applies for this visit.
      }
      return next
    })
  }, [])
  return [theme, toggle]
}
