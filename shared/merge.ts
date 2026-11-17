import { averagePledge, top10Total } from './metrics.ts'
import { shareRatio } from './metrics.ts'
import { shanghaiDate } from './time.ts'
import type {
  DatasetFile,
  HistoryPoint,
  ParseResult,
  SnapshotBody,
  SourceId,
  SourceState,
  SourceStatusCode,
} from './types.ts'

export interface ApplyInput {
  source: SourceId
  result: ParseResult
  fetchedAt: string
  httpStatus: number | null
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function wouldWipeFunding(previous: SnapshotBody, patch: Partial<SnapshotBody>): boolean {
  const nextBackers = patch.backersCount
  const nextPledged = patch.pledged
  if (previous.backersCount <= 0) return false
  return nextBackers === 0 && (nextPledged === 0 || nextPledged === undefined)
}

export function snapshotToHistoryPoint(snapshot: SnapshotBody): HistoryPoint {
  const top10Backers = snapshot.countries.length ? top10Total(snapshot.countries) : null
  return {
    provenance: snapshot.observations.funding.provenance,
    snapshotDate: shanghaiDate(snapshot.observations.funding.capturedAt),
    capturedAt: snapshot.observations.funding.capturedAt,
    capturedAtPrecision: snapshot.observations.funding.capturedAtPrecision,
    pledged: snapshot.pledged,
    goal: snapshot.goal,
    percentFunded: snapshot.percentFunded,
    backersCount: snapshot.backersCount,
    averagePledge: snapshot.averagePledge,
    usdPledged: snapshot.usdPledged,
    convertedPledgedAmount: snapshot.convertedPledgedAmount,
    newBackers: snapshot.newBackers,
    returningBackers: snapshot.returningBackers,
    comments: snapshot.comments,
    updates: snapshot.updates,
    faqs: snapshot.faqs,
    top10Backers,
    top10Share: top10Backers === null ? null : shareRatio(top10Backers, snapshot.backersCount),
  }
}

function applyPatch(snapshot: SnapshotBody, patch: Partial<SnapshotBody>, source: SourceId, fetchedAt: string): SnapshotBody {
  const next = { ...snapshot, ...patch, geographyUpdatedAt: null as null }
  next.timezone = 'Asia/Shanghai'
  if (source === 'search') {
    next.averagePledge = averagePledge(next.pledged, next.backersCount)
    next.observations = {
      ...snapshot.observations,
      funding: { provenance: 'flat', capturedAt: fetchedAt, capturedAtPrecision: 'exact' },
    }
    next.provenance = 'flat'
    next.capturedAt = fetchedAt
    next.capturedAtPrecision = 'exact'
    next.snapshotDate = shanghaiDate(fetchedAt)
  } else if (source === 'community') {
    next.observations = {
      ...snapshot.observations,
      community: { provenance: 'flat', capturedAt: fetchedAt, capturedAtPrecision: 'exact' },
    }
    next.provenance = snapshot.observations.funding.provenance
    next.capturedAt = snapshot.observations.funding.capturedAt
    next.capturedAtPrecision = snapshot.observations.funding.capturedAtPrecision
    next.snapshotDate = shanghaiDate(snapshot.observations.funding.capturedAt)
  } else if (source === 'project_json') {
    next.observations = {
      ...snapshot.observations,
      activity: { provenance: 'flat', capturedAt: fetchedAt, capturedAtPrecision: 'exact' },
    }
    next.provenance = snapshot.observations.funding.provenance
    next.capturedAt = snapshot.observations.funding.capturedAt
    next.capturedAtPrecision = snapshot.observations.funding.capturedAtPrecision
    next.snapshotDate = shanghaiDate(snapshot.observations.funding.capturedAt)
  }
  return next
}

export function applyAttempt(dataset: DatasetFile, input: ApplyInput): DatasetFile {
  const next = clone(dataset)
  const source = next.sources.find((item) => item.id === input.source)
  if (!source) return next
  if (!input.result.ok) {
    source.fetchedAt = input.fetchedAt
    source.status = input.result.status
    source.error = input.result.error
    source.accepted = false
    source.httpStatus = input.httpStatus
    next.writtenAt = input.fetchedAt
    next.writtenBy = 'status_only'
    return next
  }
  const patch = input.result.patch
  if (patch.snapshot && wouldWipeFunding(next.snapshot, patch.snapshot)) {
    return markInvalid(next, source, input, '新的筹款读数会把已有支持人数和金额清零，已拒绝。')
  }
  if (
    patch.snapshot?.newBackers != null &&
    patch.snapshot.returningBackers != null &&
    patch.snapshot.newBackers + patch.snapshot.returningBackers !== next.snapshot.backersCount
  ) {
    return markInvalid(
      next,
      source,
      input,
      '新支持与既有支持之和不等于当前支持人数，拒绝覆盖地区数据。',
    )
  }
  if (patch.snapshot?.countries && patch.snapshot.countries.length === 0) {
    return markInvalid(next, source, input, '空的国家列表不能覆盖已有排行。')
  }
  if (patch.snapshot?.cities && patch.snapshot.cities.length === 0) {
    return markInvalid(next, source, input, '空的城市列表不能覆盖已有排行。')
  }
  if (patch.project) next.project = { ...next.project, ...patch.project, id: next.project.id, slug: next.project.slug, creator: next.project.creator, key: next.project.key }
  if (patch.snapshot) next.snapshot = applyPatch(next.snapshot, patch.snapshot, input.source, input.fetchedAt)
  source.fetchedAt = input.fetchedAt
  source.lastSuccessAt = input.fetchedAt
  source.status = 'ok'
  source.accepted = true
  source.error = null
  source.httpStatus = input.httpStatus
  next.writtenAt = input.fetchedAt
  next.writtenBy = input.source === 'search' ? 'flat' : next.writtenBy
  if (input.source === 'search') sealHistory(next)
  return next
}

function markInvalid(dataset: DatasetFile, source: SourceState, input: ApplyInput, error: string): DatasetFile {
  source.fetchedAt = input.fetchedAt
  source.status = 'invalid'
  source.error = error
  source.accepted = false
  source.httpStatus = input.httpStatus
  dataset.writtenAt = input.fetchedAt
  dataset.writtenBy = 'status_only'
  return dataset
}

export function sealHistory(dataset: DatasetFile): DatasetFile {
  if (dataset.snapshot.observations.funding.provenance !== 'flat') return dataset
  const point = snapshotToHistoryPoint(dataset.snapshot)
  const exists = dataset.history.some(
    (item) => item.provenance === 'flat' && item.capturedAt === point.capturedAt,
  )
  if (!exists) dataset.history.push(point)
  return dataset
}

export function markStepFailure(
  dataset: DatasetFile,
  sourceId: SourceId,
  fetchedAt: string,
  status: Extract<SourceStatusCode, 'blocked' | 'http_error'>,
  error: string,
): DatasetFile {
  const next = clone(dataset)
  const source = next.sources.find((item) => item.id === sourceId)
  if (!source) return next
  if (source.fetchedAt === fetchedAt) return next
  const previousSuccess = source.lastSuccessAt
  source.fetchedAt = fetchedAt
  source.status = status
  source.error = error
  source.accepted = false
  source.httpStatus = null
  source.lastSuccessAt = previousSuccess
  next.writtenAt = fetchedAt
  next.writtenBy = 'status_only'
  return next
}

export function fundingUntouched(before: DatasetFile, after: DatasetFile): boolean {
  return (
    before.snapshot.pledged === after.snapshot.pledged &&
    before.snapshot.goal === after.snapshot.goal &&
    before.snapshot.backersCount === after.snapshot.backersCount &&
    before.snapshot.percentFunded === after.snapshot.percentFunded &&
    before.snapshot.usdPledged === after.snapshot.usdPledged &&
    before.snapshot.convertedPledgedAmount === after.snapshot.convertedPledgedAmount &&
    before.snapshot.observations.funding.capturedAt === after.snapshot.observations.funding.capturedAt &&
    before.snapshot.observations.funding.provenance === after.snapshot.observations.funding.provenance
  )
}
