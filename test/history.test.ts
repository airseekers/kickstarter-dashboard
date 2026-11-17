import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { applyAttempt } from '../shared/merge.ts'
import { parseDownload } from '../shared/parse.ts'
import {
  chartSegments,
  emptyManifest,
  numericSeries,
  planCollectionRecord,
  readHistoryRecord,
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
    expect(projectsForTrigger({ name: 'schedule', schedule: ARANIX_CRON })).toEqual(['aranix'])
    expect(projectsForTrigger({ name: 'schedule', schedule: '0 2 * * *' })).toEqual([])
    expect(projectsForTrigger({ name: 'workflow_dispatch' })).toEqual(['aranix'])
    expect(projectsForTrigger({ name: 'workflow_dispatch', input: 'tron' })).toEqual(['tron'])
    const workflow = readFileSync(new URL('../.github/workflows/flat.yml', import.meta.url), 'utf8')
    expect(workflow).toContain(`cron: '${ARANIX_CRON}'`)
    expect(workflow).not.toContain("cron: '0 2 * * *'")
    expect(workflow).toContain('steps.targets.outputs.aranix')
    expect(workflow).toContain('steps.targets.outputs.tron')
    expect(workflow).toContain('actions/deploy-pages@')
    expect(workflow).toContain('COLLECTION_RUN_ID')
  })
})
