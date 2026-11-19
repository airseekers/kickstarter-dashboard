import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import fxQuote from '../data/fx/latest.json'
import { buildAranixDataset } from '../shared/aranix.ts'
import { formatDisplayMoney } from '../shared/fx.ts'
import type { FxQuote } from '../shared/fx-types.ts'
import type { ChartPoint } from '../shared/history.ts'
import { Dashboard } from '../src/components/Dashboard.tsx'
import { HistoryChart } from '../src/components/HistoryChart.tsx'
import { loadBackerSeries, loadDataset } from '../src/load.ts'
import { buildSeedDataset } from '../shared/seed.ts'
import type { DatasetFile } from '../shared/types.ts'

const now = new Date('2026-11-17T02:18:00Z')

function html(
  dataset: DatasetFile,
  at = now,
  route: 'TRON' | 'ARANIX' = 'TRON',
  backers: ChartPoint[] = [],
): string {
  return renderToStaticMarkup(createElement(Dashboard, { dataset, now: at, route, backers }))
}

function section(page: string, id: string): string {
  const start = page.indexOf(`id="${id}"`)
  if (start < 0) throw new Error(`missing #${id}`)
  const next = page.indexOf('<section', start + 10)
  return page.slice(start, next === -1 ? undefined : next)
}

function markTops(page: string): Array<{ value: number; at: string; top: number; left: number }> {
  return [...page.matchAll(/<span[^>]*class="trend-mark"[^>]*>/g)].map((match) => {
    const tag = match[0]
    return {
      value: Number(tag.match(/data-value="([0-9.]+)"/)?.[1]),
      at: tag.match(/data-at="([^"]+)"/)?.[1] ?? '',
      top: Number(tag.match(/top:\s*([0-9.]+)%/)?.[1]),
      left: Number(tag.match(/left:\s*([0-9.]+)%/)?.[1]),
    }
  })
}

describe('dashboard copy', () => {
  const seed = buildSeedDataset()

  it('renders the TRON snapshot in Chinese without a fabricated trend', () => {
    const page = html(seed)
    expect(page).toContain('TRON 众筹数据总览')
    expect(page).toContain('众筹成功')
    expect(page).toContain(formatDisplayMoney(17572828, 'CNY', fxQuote as FxQuote))
    expect(page).toContain('1,389')
    expect(page).toContain('11,223.19 %')
    expect(page).toContain('112.23 倍目标')
    expect(page).toContain(formatDisplayMoney(12651.42, 'CNY', fxQuote as FxQuote))
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
    expect(degradedHtml).toContain(formatDisplayMoney(17572828, 'CNY', fxQuote as FxQuote))

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
      unit: '人',
      points: [
        { at: '2026-11-17T10:17:00+08:00', value: 10 },
        { at: '2026-11-17T11:17:00+08:00', value: null },
        { at: '2026-11-17T12:17:00+08:00', value: 12 },
      ],
    }))
    expect(page).not.toContain('<polyline')
    expect(page.match(/class="trend-mark"/g)).toHaveLength(2)
    expect(page).toContain('缺失')
    expect(page).toContain('不补 0')
    expect(page).not.toContain('>0<')
    const connected = renderToStaticMarkup(createElement(HistoryChart, {
      unit: '人',
      points: [
        { at: '2026-11-17T10:17:00+08:00', value: 10 },
        { at: '2026-11-17T11:17:00+08:00', value: 11 },
      ],
    }))
    expect(connected).toContain('<polyline')
    expect(connected).toContain('10:17')
    expect(connected).toContain('11:17')
    expect(connected).toContain('北京时间')
  })

  it('plots only the accepted ARANIX backer observations in Beijing time', () => {
    expect(loadBackerSeries('ARANIX')).toEqual([
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
    ])
    const page = html(loadDataset('ARANIX'), now, 'ARANIX', loadBackerSeries('ARANIX'))
    const trend = section(page, 'backers-trend')
    expect(trend).toContain('支持人数趋势')
    expect(trend).toContain('<polyline')
    expect(trend).toContain('2026-11-18')
    expect(trend).toContain('08:14')
    expect(trend).toContain('08:26')
    expect(trend).toContain('09:25')
    expect(trend).toContain('10:27')
    expect(trend).toContain('11:21')
    expect(trend).toContain('12:29')
    expect(trend).toContain('13:28')
    expect(trend).toContain('14:21')
    expect(trend).toContain('15:21')
    expect(trend).toContain('16:24')
    expect(trend).toContain('17:21')
    expect(trend).toContain('18:22')
    expect(trend).toContain('19:22')
    expect(trend).toContain('20:23')
    expect(trend).toContain('21:21')
    expect(trend).toContain('22:27')
    expect(trend).toContain('23:25')
    expect(trend).toContain('00:26')
    expect(trend).toContain('01:24')
    expect(trend).toContain('02:22')
    expect(trend).toContain('03:26')
    expect(trend).toContain('04:20')
    expect(trend).toContain('05:21')
    expect(trend).toContain('06:27')
    expect(trend).toContain('07:26')
    expect(trend).toContain('08:28')
    expect(trend).toContain('09:19')
    expect(trend).toContain('10:23')
    expect(trend).toContain('11:28')
    expect(trend).toContain('12:31')
    expect(trend).toContain('13:27')
    expect(trend).toContain('14:30')
    expect(trend).toContain('15:28')
    expect(trend).toContain('17:23')
    expect(trend).toContain('18:24')
    expect(trend).toContain('北京时间 UTC+8')
    expect(trend).not.toContain('2026-11-17')
    expect(trend).not.toContain('1,389')
    expect(trend).not.toContain('CNY')
    expect(trend).not.toContain('USD')
    expect(trend).not.toContain('data-value="0"')
    const marks = markTops(trend)
    expect(marks.map((mark) => mark.value)).toEqual([309, 309, 315, 320, 325, 328, 331, 336, 337, 338, 342, 347, 348, 353, 356, 358, 361, 363, 366, 370, 373, 377, 377, 382, 383, 385, 386, 389, 392, 396, 398, 402, 403, 406, 406, 407])
    const topOf = (value: number) => Math.min(...marks.filter((mark) => mark.value === value).map((mark) => mark.top))
    expect(topOf(407)).toBeLessThan(topOf(406))
    expect(topOf(406)).toBeLessThan(topOf(403))
    expect(topOf(403)).toBeLessThan(topOf(402))
    expect(topOf(402)).toBeLessThan(topOf(398))
    expect(topOf(398)).toBeLessThan(topOf(396))
    expect(topOf(396)).toBeLessThan(topOf(392))
    expect(topOf(392)).toBeLessThan(topOf(389))
    expect(topOf(389)).toBeLessThan(topOf(386))
    expect(topOf(386)).toBeLessThan(topOf(385))
    expect(topOf(385)).toBeLessThan(topOf(383))
    expect(topOf(383)).toBeLessThan(topOf(382))
    expect(topOf(382)).toBeLessThan(topOf(377))
    expect(topOf(377)).toBeLessThan(topOf(373))
    expect(topOf(373)).toBeLessThan(topOf(370))
    expect(topOf(370)).toBeLessThan(topOf(366))
    expect(topOf(366)).toBeLessThan(topOf(363))
    expect(topOf(363)).toBeLessThan(topOf(361))
    expect(topOf(361)).toBeLessThan(topOf(358))
    expect(topOf(358)).toBeLessThan(topOf(356))
    expect(topOf(356)).toBeLessThan(topOf(353))
    expect(topOf(353)).toBeLessThan(topOf(348))
    expect(topOf(348)).toBeLessThan(topOf(347))
    expect(topOf(347)).toBeLessThan(topOf(342))
    expect(topOf(342)).toBeLessThan(topOf(338))
    expect(topOf(338)).toBeLessThan(topOf(337))
    expect(topOf(337)).toBeLessThan(topOf(336))
    expect(topOf(336)).toBeLessThan(topOf(331))
    expect(topOf(331)).toBeLessThan(topOf(328))
    expect(topOf(328)).toBeLessThan(topOf(325))
    expect(topOf(325)).toBeLessThan(topOf(320))
    expect(topOf(320)).toBeLessThan(topOf(315))
    expect(topOf(315)).toBeLessThan(topOf(309))
    expect(marks[0].left).toBeLessThan(marks[1].left)
    expect(marks[1].left).toBeLessThan(marks[3].left)
    expect(section(page, 'collection')).toContain('采集节奏')
    expect(page).toContain('人民币')
  })

  it('does not invent a TRON trend from the seed or from ARANIX', () => {
    expect(loadBackerSeries('TRON')).toEqual([
      { at: '2026-11-18T10:27:43+08:00', value: 1389 },
      { at: '2026-11-19T10:23:57+08:00', value: 1389 },
    ])
    const page = html(loadDataset('TRON'), now, 'TRON', loadBackerSeries('TRON'))
    const trend = section(page, 'backers-trend')
    expect(trend).toContain('<polyline')
    expect(trend).toContain('10:27')
    expect(trend).toContain('10:23')
    expect(trend).toContain('1,389')
    expect(trend).not.toContain('至少有两次真实成功观测')
    expect(trend).not.toContain('目前已接受 1 次')
    expect(trend).not.toContain('2026-11-16')
    expect(trend).not.toContain('309')
    expect(trend).not.toContain('315')
    expect(trend).not.toContain('320')
    expect(markTops(trend).map((mark) => mark.value)).toEqual([1389, 1389])
    expect(page).toContain('采集节奏')
    expect(page).toContain('人民币')
  })

  it('shows the unlaunched ARANIX snapshot without TRON geography or amounts', () => {
    const page = html(buildAranixDataset(), now, 'ARANIX')
    expect(page).toContain('ARANIX 众筹数据总览')
    expect(page).toContain('未上线')
    expect(page).toContain(formatDisplayMoney(0, 'CNY', fxQuote as FxQuote))
    expect(page).toContain('人民币')
    expect(page).toContain('暂无公开国家排行')
    expect(page).toContain('Community 这次没有取到')
    expect(page).toContain('href="/kickstarter-dashboard/TRON/"')
    expect(page).toContain('href="/kickstarter-dashboard/ARANIX/"')
    expect(page).not.toContain('17,572,828')
    expect(page).not.toContain('美国')
    expect(page).not.toContain('<polyline')
  })
})
