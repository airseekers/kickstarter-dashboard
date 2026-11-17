import { averagePledge } from './metrics.ts'
import { cityZh, countryZh } from './places.ts'
import { snapshotToHistoryPoint } from './merge.ts'
import { SCHEMA_VERSION, type DatasetFile, type GeoRow, type ProjectConfig, type SourceId } from './types.ts'

const CAPTURED_AT = '2026-11-16T23:12:00+08:00'
const SNAPSHOT_DATE = '2026-11-16'

export const TRON_PROJECT: ProjectConfig = {
  key: 'tron',
  id: 1873694145,
  creator: 'airseekers',
  slug: 'tron-360-ai-vision-robot-mower-smooth-lawns-and-fertilizing',
  searchTerm: 'tron 360 ai vision robot mower',
  displayName: 'TRON',
  productName: '360° AI 视觉割草机器人',
  sources: {
    search: 'https://www.kickstarter.com/projects/search.json?term=tron+360+ai+vision+robot+mower',
    project_json:
      'https://www.kickstarter.com/projects/airseekers/tron-360-ai-vision-robot-mower-smooth-lawns-and-fertilizing.json',
    community:
      'https://www.kickstarter.com/projects/airseekers/tron-360-ai-vision-robot-mower-smooth-lawns-and-fertilizing/community',
    faqs: 'https://www.kickstarter.com/projects/airseekers/tron-360-ai-vision-robot-mower-smooth-lawns-and-fertilizing/faqs',
  },
}

const COUNTRY_COUNTS: Array<[string, number]> = [
  ['United States', 301],
  ['Germany', 125],
  ['France', 96],
  ['Belgium', 84],
  ['United Kingdom', 60],
  ['Netherlands', 55],
  ['Denmark', 51],
  ['Poland', 51],
  ['Italy', 45],
  ['Sweden', 41],
]

const CITY_COUNTS: Array<[string, string, number]> = [
  ['Copenhagen', 'Denmark', 21],
  ['London', 'United Kingdom', 20],
  ['Ljubljana', 'Slovenia', 18],
  ['Brussels', 'Belgium', 17],
  ['Paris', 'France', 16],
  ['Budapest', 'Hungary', 14],
  ['Vilnius', 'Lithuania', 14],
  ['Vienna', 'Austria', 13],
  ['Dublin', 'Ireland', 12],
  ['Berlin', 'Germany', 12],
]

function countries(): GeoRow[] {
  return COUNTRY_COUNTS.map(([name, backers], index) => {
    const names = countryZh(name)
    return {
      rank: index + 1,
      nameEn: name,
      nameZh: names.zh,
      countryEn: name,
      countryZh: names.zh,
      countryCode: names.code,
      backers,
    }
  })
}

function cities(): GeoRow[] {
  return CITY_COUNTS.map(([city, country, backers], index) => {
    const names = countryZh(country)
    return {
      rank: index + 1,
      nameEn: city,
      nameZh: cityZh(city),
      countryEn: country,
      countryZh: names.zh,
      countryCode: names.code,
      backers,
    }
  })
}

const observation = {
  provenance: 'manual_seed' as const,
  capturedAt: CAPTURED_AT,
  capturedAtPrecision: 'approximate' as const,
}

export function buildSeedDataset(): DatasetFile {
  const pledged = 17572828
  const backersCount = 1389
  const dataset: DatasetFile = {
    schemaVersion: SCHEMA_VERSION,
    writtenAt: CAPTURED_AT,
    writtenBy: 'manual_seed',
    project: {
      key: TRON_PROJECT.key,
      id: TRON_PROJECT.id,
      creator: TRON_PROJECT.creator,
      slug: TRON_PROJECT.slug,
      name: 'Tron 360° AI Vision Robotic Mower with Auto-Mulching',
      blurb:
        '360° AI Vision Navigation, Smart Collision Avoidance, No Wiring&Signal Issue, Mulch for Neat Lawns, No Dumping Hassle, For Complex Yard',
      displayName: TRON_PROJECT.displayName,
      productName: TRON_PROJECT.productName,
      url: `https://www.kickstarter.com/projects/${TRON_PROJECT.creator}/${TRON_PROJECT.slug}`,
      state: 'successful',
      staffPick: true,
      spotlight: true,
      isLaunched: true,
      prelaunchActivated: true,
      isInPostCampaignPledgingPhase: false,
      country: 'HK',
      locationName: 'Hong Kong, Hong Kong',
      categoryName: 'Hardware',
      currency: 'HKD',
    },
    snapshot: {
      provenance: 'manual_seed',
      snapshotDate: SNAPSHOT_DATE,
      capturedAt: CAPTURED_AT,
      capturedAtPrecision: 'approximate',
      timezone: 'Asia/Shanghai',
      pledged,
      goal: 156576,
      percentFunded: 11223.193848354793,
      backersCount,
      averagePledge: averagePledge(pledged, backersCount),
      usdPledged: '2244482.60289708',
      convertedPledgedAmount: 2250050,
      staticUsdRate: 0.12772461,
      usdExchangeRate: 0.12804146,
      fxRate: 0.12746144,
      currentCurrency: 'USD',
      newBackers: 681,
      returningBackers: 708,
      countries: countries(),
      cities: cities(),
      comments: 2680,
      updates: 47,
      faqs: 35,
      createdAt: '2023-10-18T15:38:52+08:00',
      launchedAt: '2024-04-09T22:00:10+08:00',
      deadline: '2024-05-24T22:00:10+08:00',
      stateChangedAt: '2024-05-24T22:00:10+08:00',
      campaignDays: 45,
      communityPageHeaderText: 'Last updated October 19, 2026',
      geographyUpdatedAt: null,
      observations: {
        funding: observation,
        community: observation,
        activity: observation,
      },
    },
    history: [],
    sources: (Object.keys(TRON_PROJECT.sources) as SourceId[]).map((id) => ({
      id,
      url: TRON_PROJECT.sources[id],
      fetchedAt: null,
      lastSuccessAt: null,
      httpStatus: null,
      status: 'seed',
      accepted: false,
      error: null,
    })),
    notes: [
      '人工种子快照，整理时间约 2026-11-16 23:12（北京时间，UTC+8）。这不是 Flat Data 的自动抓取。',
      '平均每位支持金额由已筹港元除以支持人数得到，不是商品单价。',
      '新老支持者表示是否曾支持 Kickstarter 上的其他项目，不代表 Airseekers 品牌复购。',
      '国家与城市只包含公开 Top 10，没有地区金额，也不能当成完整地理分布。',
      '社区页页眉 “Last updated October 19, 2026” 不是地区数据的更新时间。',
      'usd_pledged 是静态历史美元；converted_pledged_amount 是另一套现行换算。fx_rate 又是第三套，三者不能互相替代。',
    ],
  }
  dataset.history = [snapshotToHistoryPoint(dataset.snapshot)]
  return dataset
}
