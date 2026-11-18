import { TIMEZONE } from './types.ts'

const partsFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

function part(date: Date, type: Intl.DateTimeFormatPartTypes): string {
  const value = partsFormat.formatToParts(date).find((item) => item.type === type)?.value
  if (!value) return '00'
  return type === 'hour' && value === '24' ? '00' : value
}

export function toShanghaiIso(date: Date): string {
  return `${part(date, 'year')}-${part(date, 'month')}-${part(date, 'day')}T${part(date, 'hour')}:${part(date, 'minute')}:${part(date, 'second')}+08:00`
}

export function shanghaiDate(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  return `${part(date, 'year')}-${part(date, 'month')}-${part(date, 'day')}`
}

export function shanghaiClock(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  return `${part(date, 'hour')}:${part(date, 'minute')}`
}

export function formatUnixShanghai(unixSeconds: number): string | null {
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return null
  return toShanghaiIso(new Date(unixSeconds * 1000))
}

export function dateOnly(iso: string | null): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}
