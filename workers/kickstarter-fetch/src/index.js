import { isAllowedKickstarterUrl } from './allowlist.js'

const headers = {
  Accept: 'application/json, text/html;q=0.8, */*;q=0.5',
  'Accept-Language': 'en',
  'User-Agent':
    'airseekers-kickstarter-dashboard/1.0 (third-party public dataset; https://github.com/airseekers/kickstarter-dashboard)',
}

export default {
  async fetch(request) {
    const incoming = new URL(request.url)
    if (request.method !== 'GET' || incoming.pathname !== '/') {
      return new Response('not found', { status: 404 })
    }
    const target = incoming.searchParams.get('url')
    if (!target || !isAllowedKickstarterUrl(target)) {
      return new Response('url not allowed', { status: 400 })
    }
    const upstream = await fetch(target, { method: 'GET', redirect: 'manual', headers })
    const responseHeaders = new Headers()
    const type = upstream.headers.get('content-type')
    if (type) responseHeaders.set('content-type', type)
    responseHeaders.set('cache-control', 'no-store')
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders })
  },
}
