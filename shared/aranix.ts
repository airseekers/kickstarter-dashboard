import { snapshotToHistoryPoint } from './merge.ts'
import { collectionCopy } from './schedule.ts'
import { SCHEMA_VERSION, type DatasetFile, type ProjectConfig, type SourceId } from './types.ts'

export const ARANIX_CAPTURED_AT = '2026-11-17T10:51:00+08:00'

export const ARANIX_PROJECT: ProjectConfig = {
  key: 'aranix',
  id: 103950657,
  creator: 'airseekers',
  slug: 'aranix-the-worlds-first-4wd-4ws-all-terrain-robotic-mower',
  route: 'ARANIX',
  searchTerm: 'ARANIX',
  displayName: 'ARANIX',
  productName: '4WD+4WS 全地形割草机器人',
  sources: {
    search: 'https://www.kickstarter.com/projects/search.json?term=ARANIX',
    project_json:
      'https://www.kickstarter.com/projects/airseekers/aranix-the-worlds-first-4wd-4ws-all-terrain-robotic-mower.json',
    community:
      'https://www.kickstarter.com/projects/airseekers/aranix-the-worlds-first-4wd-4ws-all-terrain-robotic-mower/community',
    faqs: 'https://www.kickstarter.com/projects/airseekers/aranix-the-worlds-first-4wd-4ws-all-terrain-robotic-mower/faqs',
  },
}

const observation = {
  provenance: 'manual_seed' as const,
  capturedAt: ARANIX_CAPTURED_AT,
  capturedAtPrecision: 'approximate' as const,
}

const missingSource = '本次公开读取没有拿到该来源，不能用 0 或其他项目的数据填充。'

export function buildAranixDataset(): DatasetFile {
  const dataset: DatasetFile = {
    schemaVersion: SCHEMA_VERSION,
    writtenAt: ARANIX_CAPTURED_AT,
    writtenBy: 'manual_seed',
    project: {
      key: ARANIX_PROJECT.key,
      id: ARANIX_PROJECT.id,
      creator: ARANIX_PROJECT.creator,
      slug: ARANIX_PROJECT.slug,
      name: "ARANIX — The World's First 4WD+4WS All-Terrain Robotic Mower",
      blurb:
        '4WD+4WS | 0-Radius Turning | 40° Slope Capability | FlowCut 2.0 | Edge-Cutting Module | Tri-Fusion Position | AI Obstacle Avoidance',
      displayName: ARANIX_PROJECT.displayName,
      productName: ARANIX_PROJECT.productName,
      url: `https://www.kickstarter.com/projects/${ARANIX_PROJECT.creator}/${ARANIX_PROJECT.slug}`,
      state: 'submitted',
      staffPick: true,
      spotlight: false,
      isLaunched: false,
      prelaunchActivated: true,
      isInPostCampaignPledgingPhase: false,
      country: 'HK',
      locationName: 'Hong Kong, Hong Kong',
      categoryName: 'Hardware',
      currency: 'HKD',
    },
    snapshot: {
      provenance: 'manual_seed',
      snapshotDate: '2026-11-17',
      capturedAt: ARANIX_CAPTURED_AT,
      capturedAtPrecision: 'approximate',
      timezone: 'Asia/Shanghai',
      pledged: 0,
      goal: 0,
      percentFunded: 0,
      backersCount: 0,
      averagePledge: null,
      usdPledged: null,
      convertedPledgedAmount: null,
      staticUsdRate: 0,
      usdExchangeRate: null,
      fxRate: 0.12746144,
      currentCurrency: 'USD',
      newBackers: null,
      returningBackers: null,
      countries: [],
      cities: [],
      comments: null,
      updates: null,
      faqs: null,
      createdAt: '2026-09-30T16:27:07+08:00',
      launchedAt: null,
      deadline: null,
      stateChangedAt: '2026-10-10T15:29:16+08:00',
      campaignDays: null,
      communityPageHeaderText: null,
      geographyUpdatedAt: null,
      observations: {
        funding: observation,
        community: observation,
        activity: observation,
      },
    },
    history: [],
    sources: (Object.keys(ARANIX_PROJECT.sources) as SourceId[]).map((id) => ({
      id,
      url: ARANIX_PROJECT.sources[id],
      attemptedAt: null,
      fetchedAt: null,
      lastSuccessAt: null,
      httpStatus: null,
      status: 'seed' as const,
      accepted: false,
      error: id === 'search' ? null : missingSource,
    })),
    collection: {
      schemaVersion: 2,
      ...collectionCopy('aranix'),
      flatObservationCount: 0,
      lastAcceptedAt: null,
      lastAttemptAt: null,
    },
    notes: [
      '公开搜索 JSON（term=ARANIX）人工核对快照，约 2026-11-17 10:51（北京时间）。不是 Flat Data 自动抓取。',
      'WebFetch 可能返回缓存，不能当成实时数据。',
      '精确匹配 slug aranix-the-worlds-first-4wd-4ws-all-terrain-robotic-mower、creator airseekers、id 103950657。',
      'state=submitted，is_launched=false。pledged、goal、backers_count、percent_funded 的 0 是接口原值，不是缺失占位。',
      'launched_at 与 deadline 为 0，按空时间处理。usd_pledged 与 converted_pledged_amount 为 null。',
      'Community 读取超时，项目片段和 FAQ 未取得。地区、新老支持者、评论、更新和 FAQ 计数不可用，不用 0 填充，也不借用 TRON。',
    ],
  }
  dataset.history = [snapshotToHistoryPoint(dataset.snapshot)]
  return dataset
}
