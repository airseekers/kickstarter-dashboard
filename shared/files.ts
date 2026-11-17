import { shareRatio, top10Total } from './metrics.ts'
import { SCHEMA_VERSION, type DatasetFile, type HistoryPoint, type ProjectsFile } from './types.ts'

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function escape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function toCsv(rows: string[][]): string {
  return `${rows.map((row) => row.map(escape).join(',')).join('\n')}\n`
}

function historyRow(projectKey: string, projectId: number, point: HistoryPoint): string[] {
  return [
    cell(projectKey),
    cell(projectId),
    cell(point.snapshotDate),
    cell(point.capturedAt),
    cell(point.capturedAtPrecision),
    cell(point.provenance),
    cell(point.pledged),
    cell(point.goal),
    cell(point.percentFunded),
    cell(point.backersCount),
    cell(point.averagePledge),
    cell(point.usdPledged),
    cell(point.convertedPledgedAmount),
    cell(point.newBackers),
    cell(point.returningBackers),
    cell(point.comments),
    cell(point.updates),
    cell(point.faqs),
    cell(point.top10Backers),
    cell(point.top10Share),
  ]
}

export function filesForDataset(dataset: DatasetFile): Record<string, string> {
  const key = dataset.project.key
  const top10 = dataset.snapshot.countries.length ? top10Total(dataset.snapshot.countries) : null
  const latestRow = [
    'schema_version',
    'project_key',
    'project_id',
    'snapshot_date',
    'captured_at',
    'captured_at_precision',
    'provenance',
    'timezone',
    'state',
    'currency',
    'pledged',
    'goal',
    'percent_funded',
    'backers_count',
    'average_pledge',
    'usd_pledged',
    'converted_pledged_amount',
    'static_usd_rate',
    'usd_exchange_rate',
    'fx_rate',
    'new_backers',
    'returning_backers',
    'comments',
    'updates',
    'faqs',
    'top10_backers',
    'top10_share',
    'campaign_days',
    'community_page_header_text',
    'geography_updated_at',
  ]
  const latestValues = [
    cell(dataset.schemaVersion),
    cell(key),
    cell(dataset.project.id),
    cell(dataset.snapshot.snapshotDate),
    cell(dataset.snapshot.capturedAt),
    cell(dataset.snapshot.capturedAtPrecision),
    cell(dataset.snapshot.provenance),
    cell(dataset.snapshot.timezone),
    cell(dataset.project.state),
    cell(dataset.project.currency),
    cell(dataset.snapshot.pledged),
    cell(dataset.snapshot.goal),
    cell(dataset.snapshot.percentFunded),
    cell(dataset.snapshot.backersCount),
    cell(dataset.snapshot.averagePledge),
    cell(dataset.snapshot.usdPledged),
    cell(dataset.snapshot.convertedPledgedAmount),
    cell(dataset.snapshot.staticUsdRate),
    cell(dataset.snapshot.usdExchangeRate),
    cell(dataset.snapshot.fxRate),
    cell(dataset.snapshot.newBackers),
    cell(dataset.snapshot.returningBackers),
    cell(dataset.snapshot.comments),
    cell(dataset.snapshot.updates),
    cell(dataset.snapshot.faqs),
    cell(top10),
    cell(top10 === null ? null : shareRatio(top10, dataset.snapshot.backersCount)),
    cell(dataset.snapshot.campaignDays),
    cell(dataset.snapshot.communityPageHeaderText),
    cell(dataset.snapshot.geographyUpdatedAt),
  ]
  const countryRows = [
    ['project_key', 'snapshot_date', 'provenance', 'rank', 'name_en', 'name_zh', 'country_code', 'backers'],
    ...dataset.snapshot.countries.map((row) => [
      key,
      dataset.snapshot.snapshotDate,
      dataset.snapshot.observations.community.provenance,
      cell(row.rank),
      row.nameEn,
      row.nameZh,
      cell(row.countryCode),
      cell(row.backers),
    ]),
  ]
  const cityRows = [
    ['project_key', 'snapshot_date', 'provenance', 'rank', 'city_en', 'city_zh', 'country_en', 'country_zh', 'country_code', 'backers'],
    ...dataset.snapshot.cities.map((row) => [
      key,
      dataset.snapshot.snapshotDate,
      dataset.snapshot.observations.community.provenance,
      cell(row.rank),
      row.nameEn,
      row.nameZh,
      cell(row.countryEn),
      cell(row.countryZh),
      cell(row.countryCode),
      cell(row.backers),
    ]),
  ]
  const historyHeader = [
    'project_key',
    'project_id',
    'snapshot_date',
    'captured_at',
    'captured_at_precision',
    'provenance',
    'pledged',
    'goal',
    'percent_funded',
    'backers_count',
    'average_pledge',
    'usd_pledged',
    'converted_pledged_amount',
    'new_backers',
    'returning_backers',
    'comments',
    'updates',
    'faqs',
    'top10_backers',
    'top10_share',
  ]
  const files: Record<string, string> = {
    [`data/${key}/latest.json`]: `${JSON.stringify(dataset, null, 2)}\n`,
    [`data/${key}/sources.json`]: `${JSON.stringify(
      {
        schemaVersion: SCHEMA_VERSION,
        projectKey: key,
        writtenAt: dataset.writtenAt,
        writtenBy: dataset.writtenBy,
        sources: dataset.sources,
      },
      null,
      2,
    )}\n`,
    [`data/${key}/latest.csv`]: toCsv([latestRow, latestValues]),
    [`data/${key}/countries.csv`]: toCsv(countryRows),
    [`data/${key}/cities.csv`]: toCsv(cityRows),
    [`data/${key}/history.csv`]: toCsv([
      historyHeader,
      ...dataset.history.map((point) => historyRow(key, dataset.project.id, point)),
    ]),
  }
  for (const point of dataset.history) {
    const stamp = point.capturedAt.replace(/[-:]/g, '').replace('+0800', '')
    files[`data/${key}/history/${point.snapshotDate}-${point.provenance}-${stamp}.json`] =
      `${JSON.stringify(point, null, 2)}\n`
  }
  return files
}

export function projectsFile(projects: ProjectsFile['projects']): ProjectsFile {
  return { schemaVersion: SCHEMA_VERSION, timezone: 'Asia/Shanghai', projects }
}
