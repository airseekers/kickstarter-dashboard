export const DEFAULT_VITE_BASE = '/kickstarter-dashboard/'

export function resolveViteBase(raw: string | undefined): string {
  if (raw === undefined || raw.trim() === '') return DEFAULT_VITE_BASE
  if (raw.trim() === '/') return '/'
  const prefixed = raw.trim().startsWith('/') ? raw.trim() : `/${raw.trim()}`
  return prefixed.endsWith('/') ? prefixed : `${prefixed}/`
}

export function pageBasePath(viteBase: string): string {
  return viteBase === '/' ? '' : viteBase.replace(/\/+$/, '')
}

export function publicBase(): string {
  const env = import.meta.env
  if (env?.MODE === 'test') return resolveViteBase(env.VITE_BASE)
  const configured = env?.BASE_URL
  if (!configured) return DEFAULT_VITE_BASE
  return configured.endsWith('/') ? configured : `${configured}/`
}
