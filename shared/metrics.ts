import type { GeoRow } from './types.ts'

export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function averagePledge(pledged: number, backers: number): number | null {
  if (!Number.isFinite(pledged) || !Number.isFinite(backers) || backers <= 0) return null
  return roundTo(pledged / backers, 2)
}

export function timesGoal(percentFunded: number): number | null {
  if (!Number.isFinite(percentFunded)) return null
  return roundTo(percentFunded / 100, 2)
}

export function top10Total(rows: GeoRow[]): number {
  return rows.reduce((sum, row) => sum + row.backers, 0)
}

export function shareRatio(part: number, total: number): number | null {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return null
  return part / total
}

export function formatGrouped(value: number, digits = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(roundTo(value, digits))
}

export function formatMoney(amount: number, currency: string, digits = 0): string {
  const formatted = formatGrouped(amount, digits)
  if (currency === 'HKD') return `HK$ ${formatted}`
  return `${currency} ${formatted}`
}

export function formatPercentPoints(value: number, digits = 2): string {
  return `${formatGrouped(value, digits)} %`
}

export function formatShare(part: number, total: number): string {
  const ratio = shareRatio(part, total)
  if (ratio === null) return '—'
  return `${formatGrouped(ratio * 100, 2)}%`
}

export function parseCount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').trim()
  if (!/^\d+$/.test(cleaned)) return null
  const value = Number(cleaned)
  return Number.isInteger(value) ? value : null
}

export function stateLabel(state: string, latePledge: boolean | null): string {
  if (latePledge) return '延期认捐'
  switch (state) {
    case 'successful':
      return '众筹成功'
    case 'live':
      return '众筹中'
    case 'failed':
      return '未达标'
    case 'canceled':
      return '已取消'
    case 'submitted':
    case 'started':
      return '未上线'
    default:
      return state
  }
}

export function campaignDays(launchedUnix: number, deadlineUnix: number): number | null {
  if (!Number.isFinite(launchedUnix) || !Number.isFinite(deadlineUnix)) return null
  if (launchedUnix <= 0 || deadlineUnix <= 0 || deadlineUnix < launchedUnix) return null
  const days = (deadlineUnix - launchedUnix) / 86400
  const nearest = Math.round(days)
  if (Math.abs(days - nearest) > 0.01) return null
  return nearest
}
