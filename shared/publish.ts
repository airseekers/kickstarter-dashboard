export interface FxRates {
  rateDate: string
  usd: number
  cny: number
}

export function porcelainPaths(porcelain: string): string[] {
  return porcelain
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const body = line.slice(3).trim()
      const parts = body.split(' -> ')
      return parts[parts.length - 1] ?? body
    })
}

export function readFxRates(json: string): FxRates | null {
  try {
    const parsed = JSON.parse(json) as { date?: unknown; rateDate?: unknown; rates?: { USD?: unknown; CNY?: unknown } }
    const rateDate = typeof parsed.rateDate === 'string' ? parsed.rateDate : parsed.date
    const usd = parsed.rates?.USD
    const cny = parsed.rates?.CNY
    if (typeof rateDate !== 'string' || typeof usd !== 'number' || typeof cny !== 'number') return null
    return { rateDate, usd, cny }
  } catch {
    return null
  }
}

export function fxRatesChanged(before: string | null, after: string | null): boolean {
  const next = after ? readFxRates(after) : null
  if (!next) return false
  const previous = before ? readFxRates(before) : null
  if (!previous) return true
  return previous.rateDate !== next.rateDate || previous.usd !== next.usd || previous.cny !== next.cny
}

export function shouldPublish(input: { changedPaths: string[]; fxRatesChanged: boolean }): { publish: boolean; reason: string } {
  if (input.changedPaths.some((path) => path.includes('/history/observations/'))) {
    return { publish: true, reason: 'accepted_observation' }
  }
  if (input.fxRatesChanged) return { publish: true, reason: 'fx_rates_changed' }
  if (input.changedPaths.length === 0) return { publish: false, reason: 'no_file_changes' }
  return { publish: false, reason: 'no_material_update' }
}
