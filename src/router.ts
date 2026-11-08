import { useEffect, useState } from 'react'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export type Route = { name: 'today' } | { name: 'puzzle'; n: number } | { name: 'archive' } | { name: 'notfound' }

export function parseRoute(pathname: string): Route {
  const path = (pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname).replace(/\/+$/, '') || '/'
  if (path === '/') return { name: 'today' }
  if (path === '/archive') return { name: 'archive' }
  const m = path.match(/^\/p\/(\d+)$/)
  if (m) return { name: 'puzzle', n: Number(m[1]) }
  return { name: 'notfound' }
}

export function href(path: string): string {
  return `${BASE}${path}`
}

export function navigate(path: string) {
  history.pushState(null, '', href(path))
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo(0, 0)
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.pathname))
  useEffect(() => {
    const on = () => setRoute(parseRoute(location.pathname))
    window.addEventListener('popstate', on)
    return () => window.removeEventListener('popstate', on)
  }, [])
  return route
}
