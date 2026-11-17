import { top10Total } from './metrics.ts'
import { collectionCopy } from './schedule.ts'
import type { DatasetFile, GeoRow, SourceId, SourceState } from './types.ts'

export const HISTORY_SCHEMA_VERSION = 2

export type MeasureFreshness = 'manual_seed' | 'observed' | 'carried_forward' | 'unavailable'

export interface Measure<T> {
  value: T
  freshness: MeasureFreshness
  observedAt: string | null
}

export interface HistorySource {
  id: SourceId
  status: SourceState['status']
  acceptedThisRun: boolean
  attemptedAt: string | null
  lastSuccessAt: string | null
  error: string | null
}

export interface HistoryMeasures {
  pledged: Measure<number>
  goal: Measure<number>
  percentFunded: Measure<number>
  backersCount: Measure<number>
  averagePledge: Measure<number | null>
  usdPledged: Measure<string | null>
  convertedPledgedAmount: Measure<number | null>
  staticUsdRate: Measure<number | null>
  usdExchangeRate: Measure<number | null>
  fxRate: Measure<number | null>
  newBackers: Measure<number | null>
  returningBackers: Measure<number | null>
  comments: Measure<number | null>
  updates: Measure<number | null>
  faqs: Measure<number | null>
  countries: Measure<GeoRow[]>
  cities: Measure<GeoRow[]>
  state: Measure<string>
  createdAt: Measure<string | null>
  launchedAt: Measure<string | null>
  deadline: Measure<string | null>
  stateChangedAt: Measure<string | null>
}

export interface HistoryObservation {
  schemaVersion: typeof HISTORY_SCHEMA_VERSION
  kind: 'accepted_observation'
  projectKey: string
  projectId: number
  runId: string
  attemptedAt: string
  recordedAt: string
  timezone: 'Asia/Shanghai'
  currency: string
  geographicCoverage: 'observed' | 'carried_forward' | 'unavailable' | 'manual_seed'
  sources: HistorySource[]
  measures: HistoryMeasures
}

export interface HistoryAttempt {
  schemaVersion: typeof HISTORY_SCHEMA_VERSION
  kind: 'attempt'
  projectKey: string
  projectId: number
  runId: string
  attemptedAt: string
  recordedAt: string
  timezone: 'Asia/Shanghai'
  note: string
  sources: HistorySource[]
}

export interface ManifestRow {
  runId: string
  attemptedAt: string
  path: string
  acceptedSources: SourceId[]
  measures: Record<string, Measure<number | string | null>>
}

export interface HistoryManifest {
  schemaVersion: typeof HISTORY_SCHEMA_VERSION
  projectKey: string
  cadence: 'hourly' | 'unscheduled'
  cron: string
  observations: ManifestRow[]
  attempts: Array<{ runId: string; attemptedAt: string; path: string }>
  baseline: { kind: 'manual_seed'; capturedAt: string; note: string }
}

export interface ChartPoint {
  at: string
  value: number | null
}

const NUMERIC_FIELDS = [
  'pledged',
  'goal',
  'percentFunded',
  'backersCount',
  'averagePledge',
  'convertedPledgedAmount',
  'staticUsdRate',
  'usdExchangeRate',
  'fxRate',
  'newBackers',
  'returningBackers',
  'comments',
  'updates',
  'faqs',
] as const

export type NumericField = (typeof NUMERIC_FIELDS)[number]

export function emptyManifest(projectKey: string, capturedAt: string): HistoryManifest {
  const copy = collectionCopy(projectKey)
  return {
    schemaVersion: HISTORY_SCHEMA_VERSION,
    projectKey,
    cadence: copy.cadence,
    cron: copy.cron,
    observations: [],
    attempts: [],
    baseline: {
      kind: 'manual_seed',
      capturedAt,
      note: '人工或公开读取快照，不是 Flat Data 成功观测，不能当作历史趋势点。',
    },
  }
}

export function readHistoryRecord(value: unknown): HistoryObservation | HistoryAttempt {
  if (!value || typeof value !== 'object') throw new Error('历史记录不是对象')
  const record = value as { schemaVersion?: unknown; kind?: unknown }
  if (record.schemaVersion !== HISTORY_SCHEMA_VERSION) throw new Error('不支持的历史 schema')
  if (record.kind !== 'accepted_observation' && record.kind !== 'attempt') throw new Error('未知的历史记录类型')
  return value as HistoryObservation | HistoryAttempt
}

function sourceRows(dataset: DatasetFile, attemptedAt: string): HistorySource[] {
  return dataset.sources.map((source) => ({
    id: source.id,
    status: source.status,
    acceptedThisRun: source.accepted && source.lastSuccessAt === attemptedAt,
    attemptedAt: source.attemptedAt,
    lastSuccessAt: source.lastSuccessAt,
    error: source.error,
  }))
}

function measure<T>(value: T, freshness: MeasureFreshness, observedAt: string | null): Measure<T> {
  return { value, freshness, observedAt }
}

function groupFreshness(
  acceptedThisRun: boolean,
  attemptedAt: string,
  previous: { provenance: 'manual_seed' | 'flat'; capturedAt: string },
  hasValue: boolean,
): MeasureFreshness {
  if (acceptedThisRun) return 'observed'
  if (!hasValue) return 'unavailable'
  if (previous.provenance === 'manual_seed') return 'manual_seed'
  return previous.capturedAt === attemptedAt ? 'observed' : 'carried_forward'
}

function observedAtFor(freshness: MeasureFreshness, attemptedAt: string, previousAt: string): string | null {
  if (freshness === 'observed') return attemptedAt
  if (freshness === 'unavailable') return null
  return previousAt
}

function buildMeasures(dataset: DatasetFile, attemptedAt: string, sources: HistorySource[]): HistoryMeasures {
  const search = sources.find((source) => source.id === 'search')?.acceptedThisRun ?? false
  const community = sources.find((source) => source.id === 'community')?.acceptedThisRun ?? false
  const activity = sources.find((source) => source.id === 'project_json')?.acceptedThisRun ?? false
  const snapshot = dataset.snapshot
  const fundingFreshness = groupFreshness(search, attemptedAt, snapshot.observations.funding, true)
  const communityHas = snapshot.countries.length > 0 || snapshot.newBackers !== null || snapshot.returningBackers !== null
  const communityFreshness = groupFreshness(community, attemptedAt, snapshot.observations.community, communityHas)
  const activityHas = snapshot.comments !== null || snapshot.updates !== null || snapshot.faqs !== null
  const activityFreshness = groupFreshness(activity, attemptedAt, snapshot.observations.activity, activityHas)
  const fundingAt = observedAtFor(fundingFreshness, attemptedAt, snapshot.observations.funding.capturedAt)
  const communityAt = observedAtFor(communityFreshness, attemptedAt, snapshot.observations.community.capturedAt)
  const activityAt = observedAtFor(activityFreshness, attemptedAt, snapshot.observations.activity.capturedAt)
  return {
    pledged: measure(snapshot.pledged, fundingFreshness, fundingAt),
    goal: measure(snapshot.goal, fundingFreshness, fundingAt),
    percentFunded: measure(snapshot.percentFunded, fundingFreshness, fundingAt),
    backersCount: measure(snapshot.backersCount, fundingFreshness, fundingAt),
    averagePledge: measure(snapshot.averagePledge, fundingFreshness, fundingAt),
    usdPledged: measure(snapshot.usdPledged, snapshot.usdPledged === null && !search ? 'unavailable' : fundingFreshness, snapshot.usdPledged === null ? null : fundingAt),
    convertedPledgedAmount: measure(
      snapshot.convertedPledgedAmount,
      snapshot.convertedPledgedAmount === null && !search ? 'unavailable' : fundingFreshness,
      snapshot.convertedPledgedAmount === null ? null : fundingAt,
    ),
    staticUsdRate: measure(snapshot.staticUsdRate, fundingFreshness, fundingAt),
    usdExchangeRate: measure(
      snapshot.usdExchangeRate,
      snapshot.usdExchangeRate === null && !search ? 'unavailable' : fundingFreshness,
      snapshot.usdExchangeRate === null ? null : fundingAt,
    ),
    fxRate: measure(snapshot.fxRate, fundingFreshness, fundingAt),
    newBackers: measure(snapshot.newBackers, communityFreshness, communityAt),
    returningBackers: measure(snapshot.returningBackers, communityFreshness, communityAt),
    countries: measure(snapshot.countries, communityFreshness, communityAt),
    cities: measure(snapshot.cities, communityFreshness, communityAt),
    comments: measure(snapshot.comments, activityFreshness, activityAt),
    updates: measure(snapshot.updates, activityFreshness, activityAt),
    faqs: measure(snapshot.faqs, activityFreshness, activityAt),
    state: measure(dataset.project.state, fundingFreshness, fundingAt),
    createdAt: measure(snapshot.createdAt, fundingFreshness, fundingAt),
    launchedAt: measure(snapshot.launchedAt, fundingFreshness, fundingAt),
    deadline: measure(snapshot.deadline, fundingFreshness, fundingAt),
    stateChangedAt: measure(snapshot.stateChangedAt, fundingFreshness, fundingAt),
  }
}

function fileStamp(iso: string, runId: string): { year: string; month: string; name: string } {
  const year = iso.slice(0, 4)
  const month = iso.slice(5, 7)
  const name = `${iso.replace(/[:]/g, '')}-${runId.replace(/[^\w.-]+/g, '_')}`
  return { year, month, name }
}

function manifestMeasures(measures: HistoryMeasures): ManifestRow['measures'] {
  const output: ManifestRow['measures'] = {}
  for (const field of NUMERIC_FIELDS) {
    output[field] = measures[field] as Measure<number | null>
  }
  output.usdPledged = measures.usdPledged
  return output
}

export interface CollectionPlan {
  skipped: boolean
  dataset: DatasetFile
  manifest: HistoryManifest
  files: Record<string, string>
}

export function planCollectionRecord(input: {
  dataset: DatasetFile
  runId: string
  attemptedAt: string
  recordedAt: string
  manifest: HistoryManifest
}): CollectionPlan {
  const already = input.manifest.observations.some((row) => row.runId === input.runId)
    || input.manifest.attempts.some((row) => row.runId === input.runId)
  if (already) {
    return { skipped: true, dataset: input.dataset, manifest: input.manifest, files: {} }
  }
  const sources = sourceRows(input.dataset, input.attemptedAt)
  const touched = sources.some((source) => source.attemptedAt === input.attemptedAt)
  if (!touched) {
    return { skipped: true, dataset: input.dataset, manifest: input.manifest, files: {} }
  }
  const accepted = sources.filter((source) => source.acceptedThisRun).map((source) => source.id)
  const stamp = fileStamp(input.attemptedAt, input.runId)
  const manifest: HistoryManifest = {
    ...input.manifest,
    observations: [...input.manifest.observations],
    attempts: [...input.manifest.attempts],
  }
  const dataset: DatasetFile = {
    ...input.dataset,
    collection: { ...input.dataset.collection, lastAttemptAt: input.attemptedAt },
  }
  if (accepted.length === 0) {
    const attempt: HistoryAttempt = {
      schemaVersion: HISTORY_SCHEMA_VERSION,
      kind: 'attempt',
      projectKey: dataset.project.key,
      projectId: dataset.project.id,
      runId: input.runId,
      attemptedAt: input.attemptedAt,
      recordedAt: input.recordedAt,
      timezone: 'Asia/Shanghai',
      note: '这次没有可接受的来源。不新增观测点，也不把失败写成 0。',
      sources,
    }
    const path = `data/${dataset.project.key}/history/attempts/${stamp.year}/${stamp.month}/${stamp.name}.json`
    manifest.attempts.push({ runId: input.runId, attemptedAt: input.attemptedAt, path })
    return {
      skipped: false,
      dataset,
      manifest,
      files: {
        [path]: `${JSON.stringify(attempt, null, 2)}\n`,
        [`data/${dataset.project.key}/history/manifest.json`]: `${JSON.stringify(manifest, null, 2)}\n`,
      },
    }
  }
  const measures = buildMeasures(dataset, input.attemptedAt, sources)
  const observation: HistoryObservation = {
    schemaVersion: HISTORY_SCHEMA_VERSION,
    kind: 'accepted_observation',
    projectKey: dataset.project.key,
    projectId: dataset.project.id,
    runId: input.runId,
    attemptedAt: input.attemptedAt,
    recordedAt: input.recordedAt,
    timezone: 'Asia/Shanghai',
    currency: dataset.project.currency,
    geographicCoverage: measures.countries.freshness,
    sources,
    measures,
  }
  const path = `data/${dataset.project.key}/history/observations/${stamp.year}/${stamp.month}/${stamp.name}.json`
  manifest.observations.push({
    runId: input.runId,
    attemptedAt: input.attemptedAt,
    path,
    acceptedSources: accepted,
    measures: manifestMeasures(measures),
  })
  dataset.collection = {
    ...dataset.collection,
    flatObservationCount: manifest.observations.length,
    lastAcceptedAt: input.attemptedAt,
    lastAttemptAt: input.attemptedAt,
  }
  return {
    skipped: false,
    dataset,
    manifest,
    files: {
      [path]: `${JSON.stringify(observation, null, 2)}\n`,
      [`data/${dataset.project.key}/history/manifest.json`]: `${JSON.stringify(manifest, null, 2)}\n`,
    },
  }
}

export function numericSeries(manifest: HistoryManifest, field: NumericField): ChartPoint[] {
  return manifest.observations.map((row) => {
    const measure = row.measures[field]
    if (!measure || measure.freshness !== 'observed' || typeof measure.value !== 'number') {
      return { at: row.attemptedAt, value: null }
    }
    return { at: row.attemptedAt, value: measure.value }
  })
}

export function chartSegments(points: ChartPoint[]): ChartPoint[][] {
  const segments: ChartPoint[][] = []
  let current: ChartPoint[] = []
  for (const point of points) {
    if (point.value === null) {
      if (current.length) segments.push(current)
      current = []
      continue
    }
    current.push(point)
  }
  if (current.length) segments.push(current)
  return segments
}

export function observedPointCount(points: ChartPoint[]): number {
  return points.filter((point) => point.value !== null).length
}

export function top10Observed(countries: GeoRow[]): number | null {
  return countries.length ? top10Total(countries) : null
}
