export const PAGE_BASE = '/kickstarter-dashboard'

export const PROJECT_ROUTES = [
  { key: 'aranix', route: 'ARANIX' },
  { key: 'tron', route: 'TRON' },
] as const

export type ProjectRoute = (typeof PROJECT_ROUTES)[number]['route']

export function projectRouteFromPath(pathname: string): ProjectRoute {
  const base = PAGE_BASE.replace(/\/+$/, '')
  const trimmed = pathname.replace(/\/+$/, '')
  if (trimmed === '' || trimmed === base) return 'ARANIX'
  const prefix = `${base}/`
  const rest = trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed.replace(/^\/+/, '')
  const segment = decodeURIComponent(rest.split('/')[0] ?? '')
  if (segment === 'TRON' || segment === 'ARANIX') return segment
  return 'ARANIX'
}

export function projectKeyFromRoute(route: ProjectRoute): 'aranix' | 'tron' {
  return route === 'TRON' ? 'tron' : 'aranix'
}
