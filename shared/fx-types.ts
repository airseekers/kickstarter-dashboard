export interface FxQuote {
  schemaVersion: 1
  sourceName: string
  sourceUrl: string
  base: 'HKD'
  rateDate: string
  retrievedAt: string
  retrievedAtPrecision: 'approximate' | 'exact'
  estimated: true
  status: 'ok' | 'stale' | 'unavailable'
  rates: { USD: number; CNY: number }
  error: string | null
  note: string
}

export function parseFrankfurter(body: string, retrievedAt: string): FxQuote | { error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return { error: '汇率响应不是 JSON。' }
  }
  if (!parsed || typeof parsed !== 'object') return { error: '汇率响应为空。' }
  const record = parsed as { base?: unknown; date?: unknown; rates?: { USD?: unknown; CNY?: unknown } }
  if (record.base !== 'HKD' || typeof record.date !== 'string') return { error: '汇率基准或日期无效。' }
  const usd = record.rates?.USD
  const cny = record.rates?.CNY
  if (typeof usd !== 'number' || typeof cny !== 'number' || usd <= 0 || cny <= 0) {
    return { error: '汇率数值无效。' }
  }
  return {
    schemaVersion: 1,
    sourceName: 'Frankfurter，欧洲央行参考汇率',
    sourceUrl: 'https://api.frankfurter.app/latest?from=HKD&to=USD,CNY',
    base: 'HKD',
    rateDate: record.date,
    retrievedAt,
    retrievedAtPrecision: 'exact',
    estimated: true,
    status: 'ok',
    rates: { USD: usd, CNY: cny },
    error: null,
    note: '把项目货币港元估算成美元或人民币。不是 Kickstarter 的 usd_pledged，也不是 converted_pledged_amount。',
  }
}

export function keepLastQuote(previous: FxQuote, error: string, attemptedAt: string): FxQuote {
  if (previous.status === 'unavailable' || previous.rates.CNY <= 0) {
    return { ...previous, status: 'unavailable', error, retrievedAt: attemptedAt }
  }
  return { ...previous, status: 'stale', error, retrievedAt: previous.retrievedAt }
}
