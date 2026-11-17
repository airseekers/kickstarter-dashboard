const CREATOR = 'airseekers'

export function isAllowedKickstarterUrl(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) return false
  if (url.hostname !== 'www.kickstarter.com') return false
  if (url.pathname.includes('//') || url.pathname.includes('..')) return false
  const path = url.pathname
  if (path === '/projects/search.json') {
    const term = url.searchParams.get('term')
    return Boolean(term) && [...url.searchParams.keys()].every((key) => key === 'term')
  }
  if (url.search) return false
  if (new RegExp(`^/projects/${CREATOR}/[a-z0-9-]+\\.json$`).test(path)) return true
  if (new RegExp(`^/projects/${CREATOR}/[a-z0-9-]+/(?:community|faqs)$`).test(path)) return true
  return false
}
