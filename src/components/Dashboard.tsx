import { useEffect, useState } from 'react'
import fxQuote from '../../data/fx/latest.json'
import { formatDisplayMoney, readDisplayCurrency, type DisplayCurrency } from '../../shared/fx.ts'
import type { FxQuote } from '../../shared/fx-types.ts'
import {
  freshnessCopy,
  freshnessOf,
  sourceName,
  sourceStatusLabel,
} from '../../shared/freshness.ts'
import {
  formatGrouped,
  formatPercentPoints,
  formatShare,
  stateLabel,
  timesGoal,
  top10Total,
} from '../../shared/metrics.ts'
import type { ChartPoint } from '../../shared/history.ts'
import { HistoryChart } from './HistoryChart.tsx'
import { publicBase } from '../../shared/base.ts'
import { PROJECT_ROUTES, type ProjectRoute } from '../../shared/routes.ts'
import { dateOnly, shanghaiDate } from '../../shared/time.ts'
import type { DatasetFile, GeoRow } from '../../shared/types.ts'

export function Dashboard({
  dataset,
  route,
  now,
  backers = [],
}: {
  dataset: DatasetFile
  route: ProjectRoute
  now: Date
  backers?: ChartPoint[]
}) {
  const freshness = freshnessOf(dataset, now)
  const snapshot = dataset.snapshot
  const funding = snapshot.observations.funding
  const multiple = timesGoal(snapshot.percentFunded)
  const top10 = top10Total(snapshot.countries)
  const communityMissing = dataset.sources.find((source) => source.id === 'community')?.error
  const quote = fxQuote as FxQuote
  const [display, setDisplay] = useState<DisplayCurrency>('CNY')
  useEffect(() => {
    setDisplay(readDisplayCurrency(window.localStorage))
  }, [])
  function choose(next: DisplayCurrency) {
    setDisplay(next)
    window.localStorage.setItem('kickstarter-dashboard-display-currency', next)
  }
  const money = (amount: number | null) => formatDisplayMoney(amount, display, quote)

  return (
    <main className="page" data-freshness={freshness}>
      <header className="top">
        <div className="brand">
          <h1>{dataset.project.displayName} 众筹数据总览</h1>
          <p>
            {dataset.project.creator === 'airseekers' ? 'Airseekers' : dataset.project.creator} ·{' '}
            {dataset.project.productName}
          </p>
          <nav className="project-nav" aria-label="项目">
            {PROJECT_ROUTES.map((item) => (
              <a
                key={item.route}
                href={`${publicBase()}${item.route}/`}
                aria-current={item.route === route ? 'page' : undefined}
              >
                {item.route}
              </a>
            ))}
          </nav>
          <div className="currency-switch" role="group" aria-label="显示货币">
            <button type="button" aria-pressed={display === 'CNY'} onClick={() => choose('CNY')}>人民币</button>
            <button type="button" aria-pressed={display === 'USD'} onClick={() => choose('USD')}>美元</button>
          </div>
        </div>
        <div className={`state-pill state-${dataset.project.state}`}>
          <span className="dot" />
          {stateLabel(dataset.project.state, dataset.project.isInPostCampaignPledgingPhase)}
        </div>
        <div className="snapshot-meta">
          <strong>数据快照 {shanghaiDate(funding.capturedAt)}</strong>
          <span>北京时间 UTC+8 · {freshnessCopy(freshness)}</span>
        </div>
      </header>

      <div className="source-row" aria-label="数据来源状态">
        {dataset.sources.map((source) => (
          <span key={source.id} className={`source-pill source-${source.status}`} title={source.error ?? source.url}>
            {sourceName(source.id)} · {sourceStatusLabel(source.status)}
          </span>
        ))}
      </div>

      <section className="kpis">
        <article className="card kpi">
          <h2>累计支持金额</h2>
          <p className="kpi-value">{money(snapshot.pledged)}</p>
          <p className="kpi-note">估算值 · 原币 {dataset.project.currency} {formatGrouped(snapshot.pledged)}</p>
        </article>
        <article className="card kpi">
          <h2>支持人数</h2>
          <p className="kpi-value">{formatGrouped(snapshot.backersCount)}</p>
          <p className="kpi-note">位公开统计支持者</p>
        </article>
        <article className="card kpi">
          <h2>目标达成率</h2>
          <p className="kpi-value">
            {formatPercentPoints(snapshot.percentFunded)}
          </p>
          <p className="kpi-note">
            {multiple === null ? '—' : <span className="accent">{formatGrouped(multiple, 2)} 倍目标</span>}
            <span className="goal">目标 {money(snapshot.goal)}</span>
          </p>
        </article>
        <article className="card kpi">
          <h2>平均每位支持金额</h2>
          <p className="kpi-value">
            {money(snapshot.averagePledge)}
          </p>
          <p className="kpi-note">计算值，非商品单价</p>
        </article>
      </section>

      <section className="mid">
        <article className="card">
          <div className="card-head">
            <h2>
              <span>01</span>国家支持者分布
            </h2>
            <span className="unit">单位：人</span>
          </div>
          <p className="card-kicker">公开 Top 10 · 按支持人数排序</p>
          {snapshot.countries.length === 0 ? (
            <p className="empty">暂无公开国家排行，未用 0 填充。{communityMissing ? ' Community 这次没有取到。' : ''}</p>
          ) : (
            <CountryBars rows={snapshot.countries} />
          )}
          <p className="card-foot">
            {snapshot.countries.length === 0 ? (
              '地区合计暂缺'
            ) : (
              <>
                Top 10 合计 <strong>{formatGrouped(top10)}</strong>
                <span>
                  占全部支持者 {formatShare(top10, snapshot.backersCount)} · 计算值
                </span>
              </>
            )}
          </p>
        </article>

        <article className="card donut-card">
          <div className="card-head">
            <h2>
              <span>02</span>新老支持者
            </h2>
          </div>
          <p className="card-kicker">首次与既有 Kickstarter 支持者</p>
          {snapshot.newBackers === null || snapshot.returningBackers === null ? (
            <p className="empty">暂无新老支持者拆分，未用 0 填充。{communityMissing ? ' Community 这次没有取到。' : ''}</p>
          ) : (
            <BackerSplit freshCount={snapshot.newBackers} returningCount={snapshot.returningBackers} />
          )}
          <p className="card-foot note">
            “新老”指是否曾支持 Kickstarter 其他项目，不代表 Airseekers 品牌复购。
          </p>
        </article>

        <article className="card">
          <div className="card-head">
            <h2>
              <span>03</span>城市支持者排行
            </h2>
            <span className="unit">单位：人</span>
          </div>
          <p className="card-kicker">公开 Top 10 · 按支持人数排序</p>
          {snapshot.cities.length === 0 ? (
            <p className="empty">暂无公开城市排行，未用 0 填充。{communityMissing ? ' Community 这次没有取到。' : ''}</p>
          ) : (
            <CityTable rows={snapshot.cities} />
          )}
        </article>
      </section>

      <section className="bottom">
        <article className="card">
          <div className="card-head">
            <h2>
              <span>04</span>内容活跃度
            </h2>
            <span className="unit">截至快照的累计值</span>
          </div>
          <div className="activity">
            <Activity value={snapshot.comments} label="评论" />
            <Activity value={snapshot.updates} label="更新" />
            <Activity value={snapshot.faqs} label="FAQ" />
          </div>
        </article>
        <article className="card">
          <div className="card-head">
            <h2>
              <span>05</span>项目里程碑
            </h2>
            <span className="unit">
              众筹周期 {snapshot.campaignDays === null ? '—' : `${snapshot.campaignDays} 天`}
            </span>
          </div>
          <ol className="timeline">
            <li>
              <span>项目创建</span>
              <strong>{dateOnly(snapshot.createdAt)}</strong>
            </li>
            <li>
              <span>正式上线</span>
              <strong>{dateOnly(snapshot.launchedAt)}</strong>
            </li>
            <li className="current">
              <span>众筹结束</span>
              <strong>{dateOnly(snapshot.deadline)}</strong>
            </li>
          </ol>
          <p className="card-foot">节点示意 · 非筹资趋势图</p>
        </article>
      </section>

      <section className="card" id="backers-trend">
        <div className="card-head">
          <h2>支持人数趋势</h2>
          <span className="unit">单位：人 · 北京时间</span>
        </div>
        <p className="card-kicker">只连接已接受观测中当场测到的人数。种子快照、沿用值和失败记录不连线。</p>
        <HistoryChart points={backers} unit="人" />
      </section>

      <section className="card collection" id="collection">
        <div className="card-head">
          <h2>采集节奏</h2>
          <span className="unit">{dataset.collection.cron || '不定时'}</span>
        </div>
        <p className="card-kicker">{dataset.collection.beijing}</p>
        <p className="card-foot">
          Flat Data 成功观测 <strong>{dataset.collection.flatObservationCount}</strong> 次
          <span>最近成功 {dataset.collection.lastAcceptedAt ?? '尚无'}</span>
        </p>
      </section>

      <footer className="footer">
        <div>
          <p>
            地区仅展示公开 Top 10；无地区金额和个人支持明细。支持人数趋势只使用当场测到的已接受观测，不把种子快照或缺失记成 0。
            {snapshot.communityPageHeaderText
              ? ` 社区页页眉 “${snapshot.communityPageHeaderText}” 不是地区数据更新时间。`
              : ' 没有把页面页眉日期当成地区更新时间。'}
          </p>
          <p>
            页面金额按 {quote.sourceName} 估算，汇率日 {quote.rateDate}
            {quote.status === 'stale' ? '，当前汇率已过期，沿用上次有效汇率' : ''}
            {quote.status === 'unavailable' ? '，汇率不可用，金额不换算' : ''}
            。1 港元 = {quote.rates.CNY} 人民币 / {quote.rates.USD} 美元。
            Kickstarter 静态历史美元 {snapshot.usdPledged ?? '—'}，其现行换算{' '}
            {snapshot.convertedPledgedAmount === null ? '—' : formatGrouped(snapshot.convertedPledgedAmount)}
            ，与本页估算不是同一口径。
          </p>
        </div>
        <div className="footer-brand">
          <p>第三方公开数据分析 · 与 Kickstarter 无关</p>
          <p>
            <a href={dataset.project.url} rel="noreferrer" target="_blank">
              查看来源项目
            </a>
            {' · '}
            {dataset.project.displayName} / {dataset.project.productName}
          </p>
        </div>
      </footer>
    </main>
  )
}

function Activity({ value, label }: { value: number | null; label: string }) {
  return (
    <p>
      <strong>{value === null ? '—' : formatGrouped(value)}</strong>
      <span>{label}</span>
    </p>
  )
}

function CountryBars({ rows }: { rows: GeoRow[] }) {
  const max = Math.max(...rows.map((row) => row.backers))
  return (
    <div className="bars">
      {rows.map((row) => (
        <div className="bar-row" key={row.rank}>
          <span className="rank">{String(row.rank).padStart(2, '0')}</span>
          <span className="bar-name">{row.nameZh}</span>
          <span className="track">
            <span className="fill" style={{ width: `${max === 0 ? 0 : (row.backers / max) * 100}%` }} />
          </span>
          <span className="bar-count">{formatGrouped(row.backers)}</span>
        </div>
      ))}
    </div>
  )
}

function CityTable({ rows }: { rows: GeoRow[] }) {
  return (
    <ol className="cities">
      {rows.map((row) => (
        <li key={row.rank}>
          <span className="rank">{String(row.rank).padStart(2, '0')}</span>
          <span>{row.nameZh}</span>
          <span className="city-country">{row.countryZh}</span>
          <span className="bar-count">{formatGrouped(row.backers)}</span>
        </li>
      ))}
    </ol>
  )
}

function BackerSplit({ freshCount, returningCount }: { freshCount: number; returningCount: number }) {
  const total = freshCount + returningCount
  const radius = 72
  const circumference = 2 * Math.PI * radius
  const freshLength = total === 0 ? 0 : (freshCount / total) * circumference
  const returningLength = total === 0 ? 0 : (returningCount / total) * circumference
  return (
    <div className="split">
      <svg viewBox="0 0 200 200" role="img" aria-label="新老支持者占比">
        <g transform="rotate(-90 100 100)">
          <circle
            cx="100"
            cy="100"
            r={radius}
            className="ring fresh"
            strokeDasharray={`${freshLength} ${circumference}`}
          />
          <circle
            cx="100"
            cy="100"
            r={radius}
            className="ring returning"
            strokeDasharray={`${returningLength} ${circumference}`}
            strokeDashoffset={-freshLength}
          />
        </g>
        <text x="100" y="96" textAnchor="middle" className="donut-total">
          {formatGrouped(total)}
        </text>
        <text x="100" y="118" textAnchor="middle" className="donut-caption">
          支持者总数
        </text>
      </svg>
      <div className="legend">
        <p>
          <i className="swatch fresh" />
          首次支持者
          <strong>{formatGrouped(freshCount)}</strong>
          <em>{formatShare(freshCount, total)}</em>
        </p>
        <p>
          <i className="swatch returning" />
          既有支持者
          <strong>{formatGrouped(returningCount)}</strong>
          <em>{formatShare(returningCount, total)}</em>
        </p>
      </div>
    </div>
  )
}
