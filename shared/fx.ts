import type { FxQuote } from './fx-types.ts'
import { formatGrouped } from './metrics.ts'

export type DisplayCurrency = 'CNY' | 'USD'

export function readDisplayCurrency(storage: { getItem: (key: string) => string | null } | null): DisplayCurrency {
  const value = storage?.getItem('kickstarter-dashboard-display-currency')
  return value === 'USD' ? 'USD' : 'CNY'
}

export function convertFromHkd(amount: number | null, display: DisplayCurrency, quote: FxQuote | null): number | null {
  if (amount === null || !Number.isFinite(amount)) return null
  if (!quote || quote.status === 'unavailable') return null
  const rate = quote.rates[display]
  if (!Number.isFinite(rate) || rate <= 0) return null
  const factor = 100
  return Math.round(amount * rate * factor) / factor
}

export function quoteIsUsable(quote: FxQuote | null): boolean {
  return Boolean(quote && quote.status !== 'unavailable' && quote.rates.CNY > 0 && quote.rates.USD > 0)
}

export function formatDisplayMoney(amount: number | null, display: DisplayCurrency, quote: FxQuote | null): string {
  const converted = convertFromHkd(amount, display, quote)
  if (converted === null) return '—'
  const text = formatGrouped(converted, 2)
  return display === 'CNY' ? `¥ ${text}` : `US$ ${text}`
}
