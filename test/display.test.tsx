import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { buildAranixDataset } from '../shared/aranix.ts'
import { Dashboard } from '../src/components/Dashboard.tsx'
import { HistoryChart } from '../src/components/HistoryChart.tsx'
import { buildSeedDataset } from '../shared/seed.ts'
import type { DatasetFile } from '../shared/types.ts'

const now = new Date('2026-11-17T02:18:00Z')

function html(dataset: DatasetFile, at = now, route: 'TRON' | 'ARANIX' = 'TRON'): string {
  return renderToStaticMarkup(createElement(Dashboard, { dataset, now: at, route }))
}

describe('dashboard copy', () => {
  const seed = buildSeedDataset()

  it('renders the TRON snapshot in Chinese without a fabricated trend', () => {
    const page = html(seed)
    expect(page).toContain('TRON 众筹数据总览')
    expect(page).toContain('众筹成功')
    expect(page).toContain('HK$ 17,572,828')
    expect(page).toContain('1,389')
    expect(page).toContain('11,223.19 %')
    expect(page).toContain('112.23 倍目标')
    expect(page).toContain('HK$ 12,651.42')
    expect(page).toContain('计算值，非商品单价')
    expect(page).toContain('65.44%')
    expect(page).toContain('49.03%')
    expect(page).toContain('50.97%')
    expect(page).toContain('不代表 Airseekers 品牌复购')
    expect(page).toContain('种子快照')
    expect(page).toContain('数据快照 2026-11-16')
    expect(page).toContain('Last updated October 19, 2026')
    expect(page).toContain('不是地区数据更新时间')
    expect(page).toContain('第三方公开数据分析')
    expect(page).not.toContain('<polyline')
    expect(page).not.toContain('刚刚抓取')
    expect(page).not.toContain('官方数据')
  })

  it('shows an empty geography state instead of zero-filled rows', () => {
    const dataset = buildSeedDataset()
    dataset.snapshot.countries = []
    dataset.snapshot.cities = []
    dataset.snapshot.newBackers = null
    dataset.snapshot.returningBackers = null
    dataset.snapshot.comments = null
    const page = html(dataset)
    expect(page).toContain('暂无公开国家排行')
    expect(page).toContain('暂无公开城市排行')
    expect(page).toContain('暂无新老支持者拆分')
    expect(page).not.toContain('美国')
    expect(page).toContain('>—<')
  })

  it('marks a failed collection and a stale flat snapshot differently from the seed', () => {
    const degraded = buildSeedDataset()
    degraded.sources[0].status = 'blocked'
    degraded.sources[0].fetchedAt = '2026-11-17T10:00:00+08:00'
    degraded.sources[0].error = 'Cloudflare'
    const degradedHtml = html(degraded)
    expect(degradedHtml).toContain('data-freshness="degraded"')
    expect(degradedHtml).toContain('最近采集失败')
    expect(degradedHtml).toContain('被拦截')
    expect(degradedHtml).toContain('HK$ 17,572,828')

    const stale = buildSeedDataset()
    stale.snapshot.provenance = 'flat'
    stale.snapshot.observations.funding = {
      provenance: 'flat',
      capturedAt: '2026-11-01T10:00:00+08:00',
      capturedAtPrecision: 'exact',
    }
    stale.sources.forEach((source) => {
      source.status = 'ok'
      source.fetchedAt = '2026-11-01T10:00:00+08:00'
      source.lastSuccessAt = source.fetchedAt
      source.accepted = true
    })
    expect(html(stale)).toContain('超过 48 小时未成功复核')
  })

  it('does not draw a trend from the seed snapshot', () => {
    const page = html(buildSeedDataset())
    expect(page).toContain('至少有两次真实成功观测')
    expect(page).toContain('10:17')
    expect(page).not.toContain('<polyline')
  })

  it('draws separate marks when a missing observation sits between two values', () => {
    const page = renderToStaticMarkup(createElement(HistoryChart, {
      unit: 'HKD',
      points: [
        { at: '2026-11-17T10:17:00+08:00', value: 10 },
        { at: '2026-11-17T11:17:00+08:00', value: null },
        { at: '2026-11-17T12:17:00+08:00', value: 12 },
      ],
    }))
    expect(page).not.toContain('<polyline')
    expect(page.match(/<circle /g)).toHaveLength(2)
    const connected = renderToStaticMarkup(createElement(HistoryChart, {
      unit: 'HKD',
      points: [
        { at: '2026-11-17T10:17:00+08:00', value: 10 },
        { at: '2026-11-17T11:17:00+08:00', value: 11 },
      ],
    }))
    expect(connected).toContain('<polyline')
  })

  it('shows the unlaunched ARANIX snapshot without TRON geography or amounts', () => {
    const page = html(buildAranixDataset(), now, 'ARANIX')
    expect(page).toContain('ARANIX 众筹数据总览')
    expect(page).toContain('未上线')
    expect(page).toContain('HK$ 0')
    expect(page).toContain('暂无公开国家排行')
    expect(page).toContain('Community 这次没有取到')
    expect(page).toContain('href="/kickstarter-dashboard/TRON/"')
    expect(page).toContain('href="/kickstarter-dashboard/ARANIX/"')
    expect(page).not.toContain('17,572,828')
    expect(page).not.toContain('美国')
    expect(page).not.toContain('<polyline')
  })
})
