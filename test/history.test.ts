import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { applyAttempt } from '../shared/merge.ts'
import { parseDownload } from '../shared/parse.ts'
import aranixManifestJson from '../data/aranix/history/manifest.json'
import tronManifestJson from '../data/tron/history/manifest.json'
import {
  chartSegments,
  emptyManifest,
  numericSeries,
  observedPointCount,
  planCollectionRecord,
  readHistoryRecord,
  type HistoryManifest,
} from '../shared/history.ts'
import { ARANIX_CRON, projectsForTrigger } from '../shared/schedule.ts'
import { buildSeedDataset, TRON_PROJECT } from '../shared/seed.ts'
import { buildAranixDataset } from '../shared/aranix.ts'

const search = readFileSync(new URL('../fixtures/search-tron.json', import.meta.url), 'utf8')
const fetchedAt = '2026-11-17T18:17:00+08:00'

function acceptedSearch(at = fetchedAt) {
  const parsed = parseDownload('search', search, TRON_PROJECT)
  if (!parsed.ok) throw new Error('fixture')
  return applyAttempt(buildSeedDataset(), { source: 'search', result: parsed, fetchedAt: at, httpStatus: 200 })
}

describe('collection history', () => {
  it('keeps an unchanged successful repeat and ignores the same run id', () => {
    const manifest = emptyManifest('tron', '2026-11-16T23:12:00+08:00')
    const first = planCollectionRecord({
      dataset: acceptedSearch(),
      runId: '100-1',
      attemptedAt: fetchedAt,
      recordedAt: fetchedAt,
      manifest,
    })
    expect(first.skipped).toBe(false)
    expect(first.dataset.collection.flatObservationCount).toBe(1)
    expect(first.dataset.snapshot.pledged).toBe(17572828)
    const second = planCollectionRecord({
      dataset: acceptedSearch(),
      runId: '100-1',
      attemptedAt: fetchedAt,
      recordedAt: fetchedAt,
      manifest: first.manifest,
    })
    expect(second.skipped).toBe(true)
    expect(second.files).toEqual({})
    const repeatAt = '2026-11-17T19:17:00+08:00'
    const repeat = planCollectionRecord({
      dataset: acceptedSearch(repeatAt),
      runId: '101-1',
      attemptedAt: repeatAt,
      recordedAt: repeatAt,
      manifest: first.manifest,
    })
    expect(repeat.manifest.observations).toHaveLength(2)
    expect(repeat.manifest.observations[1].measures.pledged.value).toBe(17572828)
    expect(repeat.dataset.collection.flatObservationCount).toBe(2)
  })

  it('records a blocked attempt without a zero observation', () => {
    const dataset = buildSeedDataset()
    dataset.sources[0].attemptedAt = fetchedAt
    dataset.sources[0].fetchedAt = fetchedAt
    dataset.sources[0].status = 'blocked'
    dataset.sources[0].accepted = false
    dataset.sources[0].error = 'cloudflare'
    const plan = planCollectionRecord({
      dataset,
      runId: '200-1',
      attemptedAt: fetchedAt,
      recordedAt: fetchedAt,
      manifest: emptyManifest('tron', dataset.snapshot.capturedAt),
    })
    expect(plan.manifest.observations).toHaveLength(0)
    expect(plan.manifest.attempts).toHaveLength(1)
    expect(JSON.stringify(plan.files)).not.toContain('"kind": "accepted_observation"')
    expect(plan.dataset.snapshot.pledged).toBe(17572828)
    expect(plan.dataset.collection.flatObservationCount).toBe(0)
  })

  it('does not mark carried-forward geography as observed at the new attempt', () => {
    const parsed = parseDownload('search', search, TRON_PROJECT)
    if (!parsed.ok) throw new Error('fixture')
    const dataset = applyAttempt(buildSeedDataset(), {
      source: 'search',
      result: parsed,
      fetchedAt,
      httpStatus: 200,
    })
    const plan = planCollectionRecord({
      dataset,
      runId: '300-1',
      attemptedAt: fetchedAt,
      recordedAt: fetchedAt,
      manifest: emptyManifest('tron', '2026-11-16T23:12:00+08:00'),
    })
    const file = Object.values(plan.files).find((contents) => contents.includes('accepted_observation'))
    const record = readHistoryRecord(JSON.parse(file ?? '{}'))
    if (record.kind !== 'accepted_observation') throw new Error('expected observation')
    expect(record.measures.pledged.freshness).toBe('observed')
    expect(record.measures.pledged.observedAt).toBe(fetchedAt)
    expect(record.measures.countries.freshness).toBe('manual_seed')
    expect(record.measures.countries.observedAt).toBe('2026-11-16T23:12:00+08:00')
    expect(record.measures.createdAt.value).toBe('2023-10-18T15:38:52+08:00')
    expect(record.attemptedAt).not.toBe(record.measures.createdAt.value)
    const series = numericSeries(plan.manifest, 'pledged')
    expect(series).toEqual([{ at: fetchedAt, value: 17572828 }])
  })

  it('keeps unknown future fields when the schema version is supported', () => {
    const plan = planCollectionRecord({
      dataset: acceptedSearch(),
      runId: '400-1',
      attemptedAt: fetchedAt,
      recordedAt: fetchedAt,
      manifest: emptyManifest('tron', '2026-11-16T23:12:00+08:00'),
    })
    const raw = JSON.parse(Object.values(plan.files).find((contents) => contents.includes('accepted_observation')) ?? '{}') as {
      futureField?: number
    }
    raw.futureField = 7
    const read = readHistoryRecord(raw) as { futureField?: number }
    expect(read.futureField).toBe(7)
    expect(() => readHistoryRecord({ schemaVersion: 1, kind: 'attempt' })).toThrow(/schema/)
  })

  it('plots accepted backer observations and leaves seeds, attempts, and carried values off the series', () => {
    const aranixManifest = aranixManifestJson as HistoryManifest
    const tronManifest = tronManifestJson as HistoryManifest
    const aranixSeries = numericSeries(aranixManifest, 'backersCount')
    const tronSeries = numericSeries(tronManifest, 'backersCount')
    expect(aranixSeries).toEqual([
      { at: '2026-11-18T08:14:29+08:00', value: 309 },
      { at: '2026-11-18T08:26:39+08:00', value: 309 },
      { at: '2026-11-18T09:25:51+08:00', value: 315 },
      { at: '2026-11-18T10:27:43+08:00', value: 320 },
      { at: '2026-11-18T11:21:43+08:00', value: 325 },
      { at: '2026-11-18T12:29:02+08:00', value: 328 },
      { at: '2026-11-18T13:28:13+08:00', value: 331 },
      { at: '2026-11-18T14:21:40+08:00', value: 336 },
      { at: '2026-11-18T15:21:58+08:00', value: 337 },
      { at: '2026-11-18T16:24:23+08:00', value: 338 },
      { at: '2026-11-18T17:21:51+08:00', value: 342 },
      { at: '2026-11-18T18:22:05+08:00', value: 347 },
      { at: '2026-11-18T19:22:47+08:00', value: 348 },
      { at: '2026-11-18T20:23:42+08:00', value: 353 },
      { at: '2026-11-18T21:21:27+08:00', value: 356 },
      { at: '2026-11-18T22:27:53+08:00', value: 358 },
      { at: '2026-11-18T23:25:02+08:00', value: 361 },
      { at: '2026-11-19T00:26:30+08:00', value: 363 },
      { at: '2026-11-19T01:24:44+08:00', value: 366 },
      { at: '2026-11-19T02:22:32+08:00', value: 370 },
      { at: '2026-11-19T03:26:22+08:00', value: 373 },
      { at: '2026-11-19T04:20:44+08:00', value: 377 },
      { at: '2026-11-19T05:21:04+08:00', value: 377 },
      { at: '2026-11-19T06:27:26+08:00', value: 382 },
      { at: '2026-11-19T07:26:02+08:00', value: 383 },
      { at: '2026-11-19T08:28:04+08:00', value: 385 },
      { at: '2026-11-19T09:19:20+08:00', value: 386 },
      { at: '2026-11-19T10:23:57+08:00', value: 389 },
      { at: '2026-11-19T11:28:01+08:00', value: 392 },
      { at: '2026-11-19T12:31:34+08:00', value: 396 },
      { at: '2026-11-19T13:27:49+08:00', value: 398 },
      { at: '2026-11-19T14:30:47+08:00', value: 402 },
      { at: '2026-11-19T15:28:27+08:00', value: 403 },
      { at: '2026-11-19T16:24:41+08:00', value: 406 },
      { at: '2026-11-19T17:23:10+08:00', value: 406 },
      { at: '2026-11-19T18:24:16+08:00', value: 407 },
      { at: '2026-11-19T19:29:33+08:00', value: 407 },
      { at: '2026-11-19T20:25:42+08:00', value: 409 },
      { at: '2026-11-19T21:27:48+08:00', value: 411 },
      { at: '2026-11-19T22:29:38+08:00', value: 413 },
      { at: '2026-11-20T09:29:23+08:00', value: 425 },
      { at: '2026-11-20T10:30:38+08:00', value: 425 },
      { at: '2026-11-20T11:23:34+08:00', value: 425 },
      { at: '2026-11-20T12:30:43+08:00', value: 425 },
      { at: '2026-11-20T13:21:47+08:00', value: 426 },
      { at: '2026-11-20T14:30:47+08:00', value: 426 },
      { at: '2026-11-20T15:27:26+08:00', value: 426 },
      { at: '2026-11-20T16:28:57+08:00', value: 426 },
    ])
    expect(tronSeries).toEqual([
      { at: '2026-11-18T10:27:43+08:00', value: 1389 },
      { at: '2026-11-19T10:23:57+08:00', value: 1389 },
      { at: '2026-11-20T10:30:38+08:00', value: 1389 },
    ])
    expect(observedPointCount(aranixSeries)).toBe(48)
    expect(observedPointCount(tronSeries)).toBe(3)
    expect(chartSegments(aranixSeries)).toHaveLength(1)
    expect(chartSegments(tronSeries)).toHaveLength(1)
    for (const manifest of [aranixManifest, tronManifest]) {
      const series = numericSeries(manifest, 'backersCount')
      expect(series.map((point) => point.at)).toEqual(manifest.observations.map((row) => row.attemptedAt))
      expect(series.some((point) => point.at === manifest.baseline.capturedAt)).toBe(false)
      expect(manifest.baseline.kind).toBe('manual_seed')
      expect(manifest.observations.some((row) => row.path.includes('manual_seed') || row.path.includes('/attempts/'))).toBe(false)
      for (const attempt of manifest.attempts) {
        expect(series.some((point) => point.at === attempt.attemptedAt)).toBe(false)
      }
      for (const row of manifest.observations) {
        const record = readHistoryRecord(JSON.parse(readFileSync(new URL(`../${row.path}`, import.meta.url), 'utf8')))
        expect(record.kind).toBe('accepted_observation')
        if (record.kind !== 'accepted_observation') continue
        expect(record.projectKey).toBe(manifest.projectKey)
        expect(record.measures.backersCount.freshness).toBe('observed')
        expect(record.measures.backersCount.value).toBe(row.measures.backersCount.value)
      }
    }
    const carried = emptyManifest('tron', '2026-11-16T23:12:00+08:00')
    carried.attempts.push({
      runId: 'blocked',
      attemptedAt: '2026-11-18T11:17:00+08:00',
      path: 'data/tron/history/attempts/2026/11/blocked.json',
    })
    carried.observations.push({
      runId: 'carried',
      attemptedAt: '2026-11-18T10:17:00+08:00',
      path: 'data/tron/history/observations/2026/11/carried.json',
      acceptedSources: ['community'],
      measures: {
        backersCount: { value: 1389, freshness: 'carried_forward', observedAt: '2026-11-16T23:12:00+08:00' },
      },
    })
    expect(numericSeries(carried, 'backersCount')).toEqual([
      { at: '2026-11-18T10:17:00+08:00', value: null },
    ])
    expect(numericSeries(emptyManifest('aranix', '2026-11-17T10:51:00+08:00'), 'backersCount')).toEqual([])
  })

  it('does not count the ARANIX manual snapshot as a Flat observation', () => {
    const dataset = buildAranixDataset()
    expect(dataset.collection.flatObservationCount).toBe(0)
    expect(dataset.collection.cron).toBe(ARANIX_CRON)
    expect(emptyManifest('aranix', dataset.snapshot.capturedAt).observations).toEqual([])
    expect(chartSegments([{ at: 'a', value: 0 }, { at: 'b', value: null }, { at: 'c', value: 0 }])).toEqual([
      [{ at: 'a', value: 0 }],
      [{ at: 'c', value: 0 }],
    ])
  })
})

describe('schedule gating', () => {
  it('fetches ARANIX hourly and TRON daily', () => {
    expect(projectsForTrigger({ name: 'schedule', schedule: ARANIX_CRON, utcHour: 3 })).toEqual(['aranix'])
    expect(projectsForTrigger({ name: 'schedule', schedule: ARANIX_CRON, utcHour: 2 })).toEqual(['aranix', 'tron'])
    expect(projectsForTrigger({ name: 'schedule', schedule: '0 2 * * *', utcHour: 2 })).toEqual([])
    expect(projectsForTrigger({ name: 'workflow_dispatch' })).toEqual(['aranix'])
    expect(projectsForTrigger({ name: 'workflow_dispatch', input: 'tron' })).toEqual(['tron'])
    expect(projectsForTrigger({ name: 'workflow_dispatch', input: 'both' })).toEqual(['aranix', 'tron'])
    const workflow = readFileSync(new URL('../.github/workflows/flat.yml', import.meta.url), 'utf8')
    expect(workflow).toContain(`cron: '${ARANIX_CRON}'`)
    expect(workflow).not.toContain("cron: '0 2 * * *'")
    expect(workflow).toContain('steps.targets.outputs.aranix')
    expect(workflow).toContain('steps.targets.outputs.tron')
    expect(workflow).toContain('actions/deploy-pages@')
    expect(workflow).toContain('COLLECTION_RUN_ID')
  })
})
