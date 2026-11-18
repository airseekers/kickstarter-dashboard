import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import fxQuote from '../data/fx/latest.json'
import { convertFromHkd, formatDisplayMoney, readDisplayCurrency } from '../shared/fx.ts'
import { keepLastQuote, parseFrankfurter, type FxQuote } from '../shared/fx-types.ts'

const quote = fxQuote as FxQuote

describe('display currency', () => {
  it('defaults to CNY and converts HKD with the cached ECB rate', () => {
    expect(readDisplayCurrency(null)).toBe('CNY')
    expect(readDisplayCurrency({ getItem: () => 'USD' })).toBe('USD')
    expect(readDisplayCurrency({ getItem: () => 'HKD' })).toBe('CNY')
    expect(quote.rateDate).toBe('2026-11-17')
    expect(quote.rates.CNY).toBe(0.84961)
    expect(quote.rates.USD).toBe(0.12745)
    expect(convertFromHkd(17572828, 'CNY', quote)).toBe(14930050.4)
    expect(convertFromHkd(17572828, 'USD', quote)).toBe(2239656.93)
    expect(formatDisplayMoney(null, 'CNY', quote)).toBe('—')
    expect(convertFromHkd(null, 'USD', quote)).toBeNull()
  })

  it('keeps the last rate when a new fetch fails and does not invent one', () => {
    const bad = parseFrankfurter('<html>Just a moment', '2026-11-17T12:00:00+08:00')
    expect('error' in bad).toBe(true)
    const stale = keepLastQuote(quote, '请求失败', '2026-11-17T12:00:00+08:00')
    expect(stale.status).toBe('stale')
    expect(stale.rates).toEqual(quote.rates)
    expect(stale.retrievedAt).toBe(quote.retrievedAt)
    const empty = keepLastQuote({ ...quote, status: 'unavailable', rates: { USD: 0, CNY: 0 } }, '无汇率', '2026-11-17T12:00:00+08:00')
    expect(empty.status).toBe('unavailable')
    expect(convertFromHkd(100, 'CNY', empty)).toBeNull()
  })

  it('does not replace Kickstarter historical USD fields', () => {
    const raw = readFileSync(new URL('../data/tron/latest.json', import.meta.url), 'utf8')
    expect(raw).toContain('2244482.60289708')
    expect(raw).toContain('2250050')
    expect(raw).not.toContain('0.12744')
  })
})
