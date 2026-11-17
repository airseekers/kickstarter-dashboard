export const SCHEMA_VERSION = 1 as const
export const TIMEZONE = 'Asia/Shanghai' as const

export type SourceId = 'search' | 'project_json' | 'community' | 'faqs'

export type SourceStatusCode =
  | 'seed'
  | 'ok'
  | 'blocked'
  | 'http_error'
  | 'parse_error'
  | 'mismatch'
  | 'invalid'
  | 'empty'

export type Provenance = 'manual_seed' | 'flat'

export interface ProjectConfig {
  key: string
  id: number
  creator: string
  slug: string
  /** Uppercase path suffix, for example TRON or ARANIX. */
  route: string
  searchTerm: string
  displayName: string
  productName: string
  sources: Record<SourceId, string>
}

export interface ProjectsFile {
  schemaVersion: number
  timezone: typeof TIMEZONE
  projects: ProjectConfig[]
}

export interface GeoRow {
  rank: number
  nameEn: string
  nameZh: string
  countryEn: string | null
  countryZh: string | null
  countryCode: string | null
  backers: number
}

export interface Observation {
  provenance: Provenance
  capturedAt: string
  capturedAtPrecision: 'approximate' | 'exact'
}

export interface HistoryPoint {
  provenance: Provenance
  snapshotDate: string
  capturedAt: string
  capturedAtPrecision: 'approximate' | 'exact'
  pledged: number
  goal: number
  percentFunded: number
  backersCount: number
  averagePledge: number | null
  usdPledged: string | null
  convertedPledgedAmount: number | null
  newBackers: number | null
  returningBackers: number | null
  comments: number | null
  updates: number | null
  faqs: number | null
  top10Backers: number | null
  top10Share: number | null
}

export interface SourceState {
  id: SourceId
  url: string
  /** Last time this source was attempted, including failures. */
  attemptedAt: string | null
  /** Last attempt time. Kept alongside attemptedAt for earlier files. */
  fetchedAt: string | null
  /** Last time a payload from this source was accepted. */
  lastSuccessAt: string | null
  httpStatus: number | null
  status: SourceStatusCode
  accepted: boolean
  error: string | null
}

export interface CollectionMeta {
  schemaVersion: 2
  cadence: 'hourly' | 'daily'
  cron: string
  beijing: string
  flatObservationCount: number
  lastAcceptedAt: string | null
  lastAttemptAt: string | null
}

export interface ProjectIdentity {
  key: string
  id: number
  creator: string
  slug: string
  name: string
  blurb: string
  displayName: string
  productName: string
  url: string
  state: string
  staffPick: boolean | null
  spotlight: boolean | null
  isLaunched: boolean | null
  prelaunchActivated: boolean | null
  isInPostCampaignPledgingPhase: boolean | null
  country: string
  locationName: string | null
  categoryName: string | null
  currency: string
}

export interface SnapshotBody {
  provenance: Provenance
  snapshotDate: string
  capturedAt: string
  capturedAtPrecision: 'approximate' | 'exact'
  timezone: typeof TIMEZONE
  pledged: number
  goal: number
  percentFunded: number
  backersCount: number
  averagePledge: number | null
  usdPledged: string | null
  convertedPledgedAmount: number | null
  staticUsdRate: number | null
  usdExchangeRate: number | null
  fxRate: number | null
  currentCurrency: string | null
  newBackers: number | null
  returningBackers: number | null
  countries: GeoRow[]
  cities: GeoRow[]
  comments: number | null
  updates: number | null
  faqs: number | null
  createdAt: string | null
  launchedAt: string | null
  deadline: string | null
  stateChangedAt: string | null
  campaignDays: number | null
  communityPageHeaderText: string | null
  /** Page-header copy is not a geography timestamp. This stays null on purpose. */
  geographyUpdatedAt: null
  observations: {
    funding: Observation
    community: Observation
    activity: Observation
  }
}

export interface DatasetFile {
  schemaVersion: typeof SCHEMA_VERSION
  writtenAt: string
  writtenBy: Provenance | 'status_only'
  project: ProjectIdentity
  snapshot: SnapshotBody
  history: HistoryPoint[]
  sources: SourceState[]
  notes: string[]
  collection: CollectionMeta
}

export interface AcceptedPatch {
  project?: Partial<ProjectIdentity>
  snapshot?: Partial<SnapshotBody>
}

export type ParseResult =
  | { ok: true; patch: AcceptedPatch; sanitizedRaw: unknown }
  | { ok: false; status: Exclude<SourceStatusCode, 'seed' | 'ok'>; error: string }
