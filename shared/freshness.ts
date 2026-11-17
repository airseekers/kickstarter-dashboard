import type { DatasetFile, SourceState, SourceStatusCode } from './types.ts'

export type Freshness = 'seed' | 'live' | 'stale' | 'degraded'

const STALE_MS = 48 * 60 * 60 * 1000

export function sourceStatusLabel(status: SourceStatusCode): string {
  switch (status) {
    case 'seed':
      return '种子'
    case 'ok':
      return '已采集'
    case 'blocked':
      return '被拦截'
    case 'http_error':
      return '请求失败'
    case 'parse_error':
      return '解析失败'
    case 'mismatch':
      return '项目不匹配'
    case 'invalid':
      return '未通过校验'
    case 'empty':
      return '空响应'
  }
}

export function sourceName(id: SourceState['id']): string {
  switch (id) {
    case 'search':
      return '搜索 JSON'
    case 'project_json':
      return '项目片段'
    case 'community':
      return 'Community'
    case 'faqs':
      return 'FAQ'
  }
}

export function freshnessOf(dataset: DatasetFile, now: Date): Freshness {
  const failed = dataset.sources.some(
    (source) => source.fetchedAt && source.status !== 'ok' && source.status !== 'seed',
  )
  if (dataset.snapshot.observations.funding.provenance === 'manual_seed') {
    return failed ? 'degraded' : 'seed'
  }
  const age = now.getTime() - Date.parse(dataset.snapshot.observations.funding.capturedAt)
  if (Number.isFinite(age) && age > STALE_MS) return 'stale'
  if (failed) return 'degraded'
  return 'live'
}

export function freshnessCopy(freshness: Freshness): string {
  switch (freshness) {
    case 'seed':
      return '种子快照 · 非实时数据'
    case 'degraded':
      return '最近采集失败 · 沿用上次有效数据'
    case 'stale':
      return '超过 48 小时未成功复核'
    case 'live':
      return 'Flat Data 已采集 · 北京时间'
  }
}

export function canShowTrend(dataset: DatasetFile): boolean {
  return dataset.history.length >= 2 && dataset.history.some((point) => point.provenance === 'flat')
}
