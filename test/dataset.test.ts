import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { filesForDataset } from '../shared/files.ts'
import { emptyManifest, planCollectionRecord } from '../shared/history.ts'
import { applyAttempt, fundingUntouched, markStepFailure } from '../shared/merge.ts'
import { averagePledge, formatShare, top10Total } from '../shared/metrics.ts'
import { splitCityCountry } from '../shared/places.ts'
import { containsSignedUrl } from '../shared/sanitize.ts'
import { parseDownload } from '../shared/parse.ts'
import { ARANIX_PROJECT, buildAranixDataset } from '../shared/aranix.ts'
import { buildSeedDataset, TRON_PROJECT } from '../shared/seed.ts'
import { formatUnixShanghai } from '../shared/time.ts'

const read = (name: string) => readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8')

describe('seed snapshot', () => {
  const seed = buildSeedDataset()

  it('keeps the 2026-11-16 manual observation and the published TRON figures', () => {
    expect(seed.snapshot.provenance).toBe('manual_seed')
    expect(seed.snapshot.snapshotDate).toBe('2026-11-16')
    expect(seed.snapshot.capturedAt).toBe('2026-11-16T23:12:00+08:00')
    expect(seed.snapshot.observations.funding.provenance).toBe('manual_seed')
    expect(seed.snapshot.pledged).toBe(17572828)
    expect(seed.snapshot.goal).toBe(156576)
    expect(seed.snapshot.backersCount).toBe(1389)
    expect(seed.snapshot.percentFunded).toBe(11223.193848354793)
    expect(seed.snapshot.usdPledged).toBe('2244482.60289708')
    expect(seed.snapshot.convertedPledgedAmount).toBe(2250050)
    expect(seed.snapshot.usdPledged).not.toBe(String(seed.snapshot.convertedPledgedAmount))
    expect(seed.snapshot.newBackers).toBe(681)
    expect(seed.snapshot.returningBackers).toBe(708)
    expect(seed.snapshot.comments).toBe(2680)
    expect(seed.snapshot.updates).toBe(47)
    expect(seed.snapshot.faqs).toBe(35)
    expect(seed.project.id).toBe(1873694145)
    expect(seed.history).toHaveLength(1)
    expect(seed.history[0].provenance).toBe('manual_seed')
    expect(seed.sources.every((source) => source.status === 'seed' && source.fetchedAt === null)).toBe(true)
  })

  it('computes average pledge, top 10 coverage, and Shanghai timestamps', () => {
    expect(seed.snapshot.averagePledge).toBe(averagePledge(17572828, 1389))
    expect(seed.snapshot.averagePledge).toBe(12651.42)
    expect(top10Total(seed.snapshot.countries)).toBe(909)
    expect(formatShare(909, 1389)).toBe('65.44%')
    expect(formatShare(681, 1389)).toBe('49.03%')
    expect(formatShare(708, 1389)).toBe('50.97%')
    expect(formatUnixShanghai(1697614732)).toBe('2023-10-18T15:38:52+08:00')
    expect(formatUnixShanghai(1712671210)).toBe('2024-04-09T22:00:10+08:00')
    expect(formatUnixShanghai(1716559210)).toBe('2024-05-24T22:00:10+08:00')
    expect(formatUnixShanghai(0)).toBeNull()
    expect(seed.snapshot.geographyUpdatedAt).toBeNull()
    expect(seed.snapshot.communityPageHeaderText).toBe('Last updated October 19, 2026')
  })

  it('keeps the project list and the accepted TRON search observation', () => {
    const committed = JSON.parse(readFileSync(new URL('../data/tron/latest.json', import.meta.url), 'utf8'))
    const projects = JSON.parse(readFileSync(new URL('../data/projects.json', import.meta.url), 'utf8'))
    expect(projects.projects).toEqual([ARANIX_PROJECT, TRON_PROJECT])
    expect(projects.timezone).toBe('Asia/Shanghai')
    expect(committed.project.id).toBe(1873694145)
    expect(committed.project.state).toBe('successful')
    expect(committed.snapshot.pledged).toBe(17572828)
    expect(committed.snapshot.goal).toBe(156576)
    expect(committed.snapshot.backersCount).toBe(1389)
    expect(committed.snapshot.percentFunded).toBe(11223.193848354793)
    expect(committed.snapshot.usdPledged).toBe('2244482.60289708')
    expect(committed.snapshot.convertedPledgedAmount).toBe(2250050)
    expect(committed.snapshot.fxRate).toBe(0.12746233)
    expect(committed.snapshot.capturedAt).toBe('2026-11-19T10:23:57+08:00')
    expect(committed.snapshot.provenance).toBe('flat')
    expect(committed.snapshot.snapshotDate).toBe('2026-11-19')
    const flatObservation = {
      provenance: 'flat',
      capturedAt: '2026-11-19T10:23:57+08:00',
      capturedAtPrecision: 'exact',
    }
    expect(committed.snapshot.observations.funding).toEqual(flatObservation)
    expect(committed.snapshot.observations.community).toEqual(flatObservation)
    expect(committed.snapshot.observations.activity).toEqual(flatObservation)
    expect(committed.snapshot.newBackers).toBe(681)
    expect(committed.snapshot.returningBackers).toBe(708)
    expect(committed.snapshot.comments).toBe(2680)
    expect(committed.snapshot.updates).toBe(47)
    expect(committed.snapshot.faqs).toBe(35)
    expect(committed.snapshot.countries.map((row: { countryCode: string; backers: number }) => [row.countryCode, row.backers])).toEqual([
      ['US', 301],
      ['DE', 125],
      ['FR', 96],
      ['BE', 84],
      ['GB', 60],
      ['NL', 55],
      ['DK', 51],
      ['PL', 51],
      ['IT', 45],
      ['SE', 41],
    ])
    expect(committed.snapshot.cities.map((row: { nameEn: string; backers: number }) => [row.nameEn, row.backers])).toEqual([
      ['Copenhagen', 21],
      ['London', 20],
      ['Ljubljana', 18],
      ['Brussels', 17],
      ['Paris', 16],
      ['Budapest', 14],
      ['Vilnius', 14],
      ['Vienna', 13],
      ['Dublin', 12],
      ['Berlin', 12],
    ])
    expect(committed.snapshot.communityPageHeaderText).toBe('Last updated October 19, 2026')
    expect(committed.collection.flatObservationCount).toBe(2)
    expect(committed.sources.map((source: { id: string; status: string; accepted: boolean }) => [source.id, source.status, source.accepted])).toEqual([
      ['search', 'ok', true],
      ['project_json', 'ok', true],
      ['community', 'ok', true],
      ['faqs', 'ok', true],
    ])
  })

  it('does not store signed media URLs in the flat files', () => {
    const files = filesForDataset(seed)
    for (const contents of Object.values(files)) {
      expect(containsSignedUrl(contents)).toBe(false)
      expect(contents).not.toContain('sig=')
      expect(contents).not.toContain('signature=')
    }
    const csv = files['data/tron/latest.csv']
    expect(csv).toContain('geography_updated_at')
    expect(csv).toMatch(/,"Last updated October 19, 2026",\n$/)
  })
})

describe('parsers and preservation', () => {
  const seed = buildSeedDataset()
  const fetchedAt = '2026-11-17T10:00:00+08:00'

  it('matches the TRON id even when it is not the first search hit and strips signed URLs', () => {
    const parsed = parseDownload('search', read('search-tron.json'), TRON_PROJECT)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(JSON.stringify(parsed.sanitizedRaw)).not.toContain('sig=')
    expect(JSON.stringify(parsed.sanitizedRaw)).not.toContain('signature=')
    const next = applyAttempt(seed, { source: 'search', result: parsed, fetchedAt, httpStatus: 200 })
    expect(next.snapshot.observations.funding.provenance).toBe('flat')
    expect(next.snapshot.pledged).toBe(17572828)
    expect(next.history.every((point) => point.provenance === 'manual_seed')).toBe(true)
    expect(next.sources.find((source) => source.id === 'search')?.status).toBe('ok')
  })

  it('rejects a different project instead of taking the first result', () => {
    const parsed = parseDownload('search', read('search-wrong-id.json'), TRON_PROJECT)
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.status).toBe('mismatch')
    const next = applyAttempt(seed, { source: 'search', result: parsed, fetchedAt, httpStatus: 200 })
    expect(fundingUntouched(seed, next)).toBe(true)
    expect(next.snapshot.pledged).not.toBe(0)
    expect(next.sources.find((source) => source.id === 'search')?.status).toBe('mismatch')
  })

  it('keeps the seed when the body is a Cloudflare challenge', () => {
    const parsed = parseDownload('search', read('cloudflare.html'), TRON_PROJECT)
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.status).toBe('blocked')
    const next = applyAttempt(seed, { source: 'search', result: parsed, fetchedAt, httpStatus: null })
    expect(fundingUntouched(seed, next)).toBe(true)
    expect(next.snapshot.backersCount).toBe(1389)
    expect(next.snapshot.countries).toHaveLength(10)
    expect(next.history).toHaveLength(1)
  })

  it('rejects a zero wipe of a funded project', () => {
    const zeroed = JSON.parse(read('search-tron.json')) as { projects: Array<Record<string, unknown>> }
    const project = zeroed.projects[1]
    project.pledged = 0
    project.backers_count = 0
    project.percent_funded = 0
    project.usd_pledged = '0'
    project.converted_pledged_amount = 0
    const parsed = parseDownload('search', JSON.stringify(zeroed), TRON_PROJECT)
    expect(parsed.ok).toBe(true)
    const next = applyAttempt(seed, { source: 'search', result: parsed, fetchedAt, httpStatus: 200 })
    expect(next.snapshot.pledged).toBe(17572828)
    expect(next.snapshot.backersCount).toBe(1389)
    expect(next.sources.find((source) => source.id === 'search')?.status).toBe('invalid')
  })

  it('parses nav counts and community rows without treating the page header as geography freshness', () => {
    const fragment = parseDownload('project_json', read('project-fragment.json'), TRON_PROJECT)
    const community = parseDownload('community', read('community.html'), TRON_PROJECT)
    const faqs = parseDownload('faqs', read('faqs.html'), TRON_PROJECT)
    expect(fragment.ok && community.ok && faqs.ok).toBe(true)
    if (!fragment.ok || !community.ok || !faqs.ok) return
    expect(fragment.patch.snapshot?.comments).toBe(2680)
    expect(fragment.patch.snapshot?.updates).toBe(47)
    expect(fragment.patch.snapshot?.faqs).toBe(35)
    expect(community.patch.snapshot?.communityPageHeaderText).toBe('Last updated October 19, 2026')
    expect(community.patch.snapshot?.geographyUpdatedAt).toBeNull()
    expect(community.patch.snapshot?.countries?.[0].nameZh).toBe('美国')
    expect(community.patch.snapshot?.cities?.[2].nameZh).toBe('卢布尔雅那')
    let next = applyAttempt(seed, { source: 'project_json', result: fragment, fetchedAt, httpStatus: 200 })
    next = applyAttempt(next, { source: 'community', result: community, fetchedAt, httpStatus: 200 })
    next = applyAttempt(next, { source: 'faqs', result: faqs, fetchedAt, httpStatus: 200 })
    expect(next.snapshot.observations.funding.provenance).toBe('manual_seed')
    expect(next.snapshot.observations.community.provenance).toBe('flat')
    expect(next.snapshot.observations.activity.provenance).toBe('flat')
    expect(next.snapshot.capturedAt).toBe('2026-11-16T23:12:00+08:00')
    expect(next.history.filter((point) => point.provenance === 'flat')).toHaveLength(0)
  })

  it('does not accept a community page for a different project', () => {
    const parsed = parseDownload('community', read('community-mismatch.html'), TRON_PROJECT)
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.status).toBe('mismatch')
  })

  it('records an HTTP failure without clearing last-known-good numbers', () => {
    const next = markStepFailure(seed, 'search', fetchedAt, 'http_error', 'Flat HTTP step failed')
    expect(fundingUntouched(seed, next)).toBe(true)
    expect(next.sources.find((source) => source.id === 'search')).toMatchObject({
      status: 'http_error',
      fetchedAt,
      lastSuccessAt: null,
      accepted: false,
    })
    const again = markStepFailure(next, 'search', fetchedAt, 'blocked', 'should not overwrite')
    expect(again.sources.find((source) => source.id === 'search')?.status).toBe('http_error')
  })

  it('rejects negative counts', () => {
    const payload = JSON.parse(read('search-tron.json')) as { projects: Array<Record<string, unknown>> }
    payload.projects[1].backers_count = -1
    const parsed = parseDownload('search', JSON.stringify(payload), TRON_PROJECT)
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.status).toBe('invalid')
  })

  it('accepts a public-read community page and records geography on the dataset', () => {
    expect(splitCityCountry('Auckland New Zealand')).toEqual({ city: 'Auckland', country: 'New Zealand' })
    expect(splitCityCountry('Chicago United States')).toEqual({ city: 'Chicago', country: 'United States' })
    expect(splitCityCountry('Hong Kong Hong Kong')).toEqual({ city: 'Hong Kong', country: 'Hong Kong' })
    expect(splitCityCountry('United States')).toBeNull()

    const html = parseDownload('community', read('community.html'), TRON_PROJECT)
    const parsed = parseDownload('community', read('community-public-tron.txt'), TRON_PROJECT)
    expect(html.ok && parsed.ok).toBe(true)
    if (!html.ok || !parsed.ok) return
    expect(parsed.patch.snapshot?.countries?.map((row) => [row.nameEn, row.backers])).toEqual(
      html.patch.snapshot?.countries?.map((row) => [row.nameEn, row.backers]),
    )
    expect(parsed.patch.snapshot?.cities?.map((row) => [row.nameEn, row.countryEn, row.backers])).toEqual(
      html.patch.snapshot?.cities?.map((row) => [row.nameEn, row.countryEn, row.backers]),
    )
    expect(parsed.patch.snapshot?.newBackers).toBe(681)
    expect(parsed.patch.snapshot?.returningBackers).toBe(708)
    expect(parsed.patch.snapshot?.cities?.[2].nameZh).toBe('卢布尔雅那')
    expect(parsed.patch.snapshot?.communityPageHeaderText).toBe('Last updated October 19, 2026')
    expect(parsed.patch.snapshot?.geographyUpdatedAt).toBeNull()
    expect(JSON.stringify(parsed.sanitizedRaw)).not.toContain('sig=')

    const next = applyAttempt(seed, { source: 'community', result: parsed, fetchedAt, httpStatus: 200 })
    expect(next.snapshot.countries[0]).toMatchObject({ nameEn: 'United States', nameZh: '美国', backers: 301 })
    expect(next.snapshot.cities[0]).toMatchObject({ nameEn: 'Copenhagen', countryEn: 'Denmark', backers: 21 })
    expect(next.snapshot.newBackers).toBe(681)
    expect(next.snapshot.returningBackers).toBe(708)
    expect(next.snapshot.observations.community).toEqual({
      provenance: 'flat',
      capturedAt: fetchedAt,
      capturedAtPrecision: 'exact',
    })
    expect(next.snapshot.observations.funding.provenance).toBe('manual_seed')
    expect(next.snapshot.backersCount).toBe(1389)
    expect(next.sources.find((source) => source.id === 'community')).toMatchObject({
      status: 'ok',
      accepted: true,
      httpStatus: 200,
      lastSuccessAt: fetchedAt,
    })

    const plan = planCollectionRecord({
      dataset: next,
      runId: 'community-public',
      attemptedAt: fetchedAt,
      recordedAt: fetchedAt,
      manifest: emptyManifest('tron', seed.snapshot.capturedAt),
    })
    expect(plan.manifest.observations[0].acceptedSources).toEqual(['community'])
    const observation = JSON.parse(plan.files[plan.manifest.observations[0].path]) as {
      geographicCoverage: string
      measures: {
        pledged: { freshness: string }
        newBackers: { value: number; freshness: string; observedAt: string }
        countries: { freshness: string; value: Array<{ nameEn: string; backers: number }> }
        cities: { freshness: string; value: Array<{ nameEn: string }> }
      }
    }
    expect(observation.geographicCoverage).toBe('observed')
    expect(observation.measures.pledged.freshness).toBe('manual_seed')
    expect(observation.measures.newBackers).toEqual({ value: 681, freshness: 'observed', observedAt: fetchedAt })
    expect(observation.measures.countries.freshness).toBe('observed')
    expect(observation.measures.countries.value[0]).toMatchObject({ nameEn: 'United States', backers: 301 })
    expect(observation.measures.cities.value[2].nameEn).toBe('Ljubljana')
  })

  it('rejects a challenge page, an incomplete community page, and a count mismatch without clearing last-known-good', () => {
    const challenge = parseDownload(
      'community',
      `${read('cloudflare.html')}\nTron 360\nTop Cities\nCopenhagen Denmark\n21 backers\n`,
      TRON_PROJECT,
    )
    expect(challenge.ok).toBe(false)
    if (challenge.ok) return
    expect(challenge.status).toBe('blocked')

    const cases = [
      read('community-public-incomplete.txt'),
      read('community-public-tron.txt').replace('Top Cities', 'Cities'),
      read('community-public-tron.txt').replace('Top Countries', 'Countries'),
      read('community-public-tron.txt').replace('##### New Backers', '##### Backers'),
      read('community-public-tron.txt').replace('##### Returning Backers', '##### Previous Backers'),
      read('community-public-tron.txt').replace('\n708\n', '\n700\n'),
      read('community-public-tron.txt').replace('1,389 people are supporting Airseekers', 'people are supporting Airseekers'),
    ]
    for (const body of [read('cloudflare.html'), ...cases]) {
      const parsed = parseDownload('community', body, TRON_PROJECT)
      expect(parsed.ok).toBe(false)
      const next = applyAttempt(seed, { source: 'community', result: parsed, fetchedAt, httpStatus: null })
      expect(next.snapshot.countries).toEqual(seed.snapshot.countries)
      expect(next.snapshot.cities).toEqual(seed.snapshot.cities)
      expect(next.snapshot.newBackers).toBe(681)
      expect(next.snapshot.returningBackers).toBe(708)
      expect(next.snapshot.observations.community.provenance).toBe('manual_seed')
      expect(next.sources.find((source) => source.id === 'community')?.accepted).toBe(false)
      expect(JSON.stringify(next.snapshot.countries)).not.toContain('Auckland')
    }

    const incomplete = parseDownload('community', read('community-public-incomplete.txt'), ARANIX_PROJECT)
    expect(incomplete.ok).toBe(false)
    if (incomplete.ok) return
    expect(incomplete.status).not.toBe('mismatch')
    const aranix = applyAttempt(buildAranixDataset(), {
      source: 'community',
      result: incomplete,
      fetchedAt,
      httpStatus: null,
    })
    expect(aranix.snapshot.countries).toEqual([])
    expect(aranix.snapshot.cities).toEqual([])
    expect(aranix.snapshot.newBackers).toBeNull()
    expect(aranix.snapshot.returningBackers).toBeNull()
    expect(JSON.stringify(aranix.snapshot)).not.toContain('United Kingdom')
    expect(JSON.stringify(aranix.snapshot)).not.toContain('"newBackers":0')

    const otherProject = parseDownload('community', read('community-public-tron.txt'), ARANIX_PROJECT)
    expect(otherProject.ok).toBe(false)
    if (otherProject.ok) return
    expect(otherProject.status).toBe('mismatch')
    const copied = applyAttempt(buildAranixDataset(), {
      source: 'community',
      result: otherProject,
      fetchedAt,
      httpStatus: null,
    })
    expect(copied.snapshot.countries).toEqual([])
    expect(copied.snapshot.newBackers).toBeNull()
  })

  it('does not accept community counts that disagree with the current backer total', () => {
    const parsed = parseDownload('community', read('community-public-tron.txt'), TRON_PROJECT)
    expect(parsed.ok).toBe(true)
    const altered = structuredClone(seed)
    altered.snapshot.backersCount = 100
    const next = applyAttempt(altered, { source: 'community', result: parsed, fetchedAt, httpStatus: 200 })
    expect(next.snapshot.backersCount).toBe(100)
    expect(next.snapshot.countries).toEqual(seed.snapshot.countries)
    expect(next.snapshot.newBackers).toBe(681)
    expect(next.snapshot.observations.community.provenance).toBe('manual_seed')
    expect(next.sources.find((source) => source.id === 'community')?.status).toBe('invalid')
  })

  it('accepts project and FAQ text from a public read without borrowing the other project', () => {
    const text = [
      'ARANIX — The World\'s First 4WD+4WS All-Terrain Robotic Mower',
      'FAQ',
      '23',
      'Updates',
      '2',
      'Comments',
      '44',
    ].join('\n')
    const parsed = parseDownload('project_json', text, ARANIX_PROJECT)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.patch.snapshot).toMatchObject({ faqs: 23, updates: 2, comments: 44 })
    const wrong = parseDownload('project_json', text, TRON_PROJECT)
    expect(wrong.ok).toBe(false)
    if (wrong.ok) return
    expect(wrong.status).toBe('mismatch')
    const kept = applyAttempt(buildAranixDataset(), {
      source: 'project_json',
      result: wrong,
      fetchedAt,
      httpStatus: null,
    })
    expect(kept.snapshot.comments).toBeNull()
    expect(kept.snapshot.updates).toBeNull()
    expect(kept.snapshot.faqs).toBeNull()

    const faqs = parseDownload(
      'faqs',
      'ARANIX — The World\'s First 4WD+4WS All-Terrain Robotic Mower — FAQ\nLast updated: Tue, Nov 17 2026 9:13 am EST\n',
      ARANIX_PROJECT,
    )
    expect(faqs.ok).toBe(true)
    const faqsOnTron = parseDownload(
      'faqs',
      'ARANIX — The World\'s First 4WD+4WS All-Terrain Robotic Mower — FAQ\nLast updated: Tue, Nov 17 2026 9:13 am EST\n',
      TRON_PROJECT,
    )
    expect(faqsOnTron.ok).toBe(false)
  })
})

describe('ARANIX public snapshot', () => {
  const aranix = buildAranixDataset()

  it('uses the exact submitted project and leaves missing sources empty', () => {
    expect(aranix.project.id).toBe(103950657)
    expect(aranix.project.slug).toBe(ARANIX_PROJECT.slug)
    expect(aranix.project.state).toBe('submitted')
    expect(aranix.project.isLaunched).toBe(false)
    expect(aranix.snapshot.pledged).toBe(0)
    expect(aranix.snapshot.goal).toBe(0)
    expect(aranix.snapshot.backersCount).toBe(0)
    expect(aranix.snapshot.percentFunded).toBe(0)
    expect(aranix.snapshot.usdPledged).toBeNull()
    expect(aranix.snapshot.convertedPledgedAmount).toBeNull()
    expect(aranix.snapshot.launchedAt).toBeNull()
    expect(aranix.snapshot.deadline).toBeNull()
    expect(aranix.snapshot.countries).toEqual([])
    expect(aranix.snapshot.cities).toEqual([])
    expect(aranix.snapshot.newBackers).toBeNull()
    expect(aranix.snapshot.comments).toBeNull()
    expect(aranix.snapshot.provenance).toBe('manual_seed')
    expect(aranix.snapshot.capturedAt).toBe('2026-11-17T10:51:00+08:00')
    expect(formatUnixShanghai(1790756827)).toBe('2026-09-30T16:27:07+08:00')
    expect(formatUnixShanghai(1791617356)).toBe('2026-10-10T15:29:16+08:00')
    expect(JSON.stringify(aranix)).not.toContain('17572828')
    expect(JSON.stringify(aranix)).not.toContain('United States')
    expect(JSON.stringify(filesForDataset(aranix))).not.toContain('sig=')
  })

  it('keeps the accepted live search observation and ignores a different first search hit', () => {
    const committed = JSON.parse(readFileSync(new URL('../data/aranix/latest.json', import.meta.url), 'utf8'))
    expect(committed.project.state).toBe('live')
    expect(committed.project.isLaunched).toBe(true)
    expect(committed.snapshot.pledged).toBe(8239312)
    expect(committed.snapshot.goal).toBe(392305)
    expect(committed.snapshot.backersCount).toBe(406)
    expect(committed.snapshot.percentFunded).toBe(2100.231197665082)
    expect(committed.snapshot.capturedAt).toBe('2026-11-19T16:24:41+08:00')
    expect(committed.snapshot.provenance).toBe('flat')
    expect(committed.snapshot.comments).toBe(84)
    expect(committed.snapshot.updates).toBe(2)
    expect(committed.snapshot.faqs).toBe(23)
    expect(committed.snapshot.countries).toEqual([])
    expect(committed.snapshot.newBackers).toBeNull()
    expect(committed.collection.flatObservationCount).toBe(34)
    expect(JSON.stringify(committed)).not.toContain('17572828')
    const parsed = parseDownload('search', read('search-aranix.json'), ARANIX_PROJECT)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.patch.project?.state).toBe('submitted')
    expect(parsed.patch.snapshot?.pledged).toBe(0)
    expect(parsed.patch.snapshot?.launchedAt).toBeNull()
    const wiped = applyAttempt(buildSeedDataset(), {
      source: 'search',
      result: parsed,
      fetchedAt: '2026-11-17T10:51:00+08:00',
      httpStatus: 200,
    })
    expect(wiped.snapshot.pledged).toBe(17572828)
    expect(wiped.sources.find((source) => source.id === 'search')?.status).toBe('invalid')
    const accepted = applyAttempt(aranix, {
      source: 'search',
      result: parsed,
      fetchedAt: '2026-11-17T11:00:00+08:00',
      httpStatus: 200,
    })
    expect(accepted.snapshot.pledged).toBe(0)
    expect(accepted.snapshot.observations.funding.provenance).toBe('flat')
    expect(accepted.project.id).toBe(103950657)
  })
})
