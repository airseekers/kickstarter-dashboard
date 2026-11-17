import { isChallengePage } from './parse.ts'
import { isAllowedKickstarterUrl } from '../workers/kickstarter-fetch/src/allowlist.js'

export type FetchVia = 'worker' | 'direct'
export type FetchOutcome = 'ok' | 'retry' | 'fail'

export interface FetchAttempt {
  via: FetchVia
  url: string
}

export function workerFetchUrl(base: string, target: string): string {
  const root = base.trim().replace(/\/+$/, '')
  return `${root}/?url=${encodeURIComponent(target)}`
}

export function initialAttempt(base: string | undefined, target: string): FetchAttempt {
  const trimmed = base?.trim()
  if (trimmed && isAllowedKickstarterUrl(target)) {
    return { via: 'worker', url: workerFetchUrl(trimmed, target) }
  }
  return { via: 'direct', url: target }
}

export function classifyResponse(status: number, body: string): FetchOutcome {
  if (status === 200 && body && !isChallengePage(body)) return 'ok'
  if (status === 429 || status === 502 || status === 503) return 'retry'
  return 'fail'
}

export function followupAttempt(
  current: FetchAttempt,
  outcome: FetchOutcome,
  target: string,
  retriesUsed: number,
): FetchAttempt | null {
  if (outcome === 'ok') return null
  if (outcome === 'retry' && retriesUsed < 1) return current
  if (current.via === 'worker') return { via: 'direct', url: target }
  return null
}
