import {
  canShowTrend,
  freshnessCopy,
  freshnessOf,
  sourceName,
  sourceStatusLabel,
} from '../../shared/freshness.ts'
import {
  formatGrouped,
  formatMoney,
  formatPercentPoints,
  formatShare,
  roundTo,
  stateLabel,
  timesGoal,
  top10Total,
} from '../../shared/metrics.ts'
import { dateOnly, shanghaiDate } from '../../shared/time.ts'
import type { DatasetFile, GeoRow, HistoryPoint } from '../../shared/types.ts'

export function Dashboard({ dataset, now }: { dataset: DatasetFile; now: Date }) {
  const freshness = freshnessOf(dataset, now)
  const snapshot = dataset.snapshot
  const funding = snapshot.observations.funding
  const multiple = timesGoal(snapshot.percentFunded)
  const top10 = top10Total(snapshot.countries)
  const fxEstimate =
    snapshot.fxRate === null ? null : roundTo(snapshot.pledged * snapshot.fxRate, 2)

  return (
    <main className="page" data-freshness={freshness}>
      <header className="top">
        <div className="brand">
          <h1>TRON 众筹数据总览</h1>
          <p>
            {dataset.project.creator === 'airseekers' ? 'Airseekers' : dataset.project.creator} ·{' '}
            {dataset.project.productName}
          </p>
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
          <p className="kpi-value">{formatMoney(snapshot.pledged, dataset.project.currency)}</p>
          <p className="kpi-note">项目货币 · 港元 {dataset.project.currency}</p>
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
            <span className="goal">目标 {formatMoney(snapshot.goal, dataset.project.currency)}</span>
          </p>
        </article>
        <article className="card kpi">
          <h2>平均每位支持金额</h2>
          <p className="kpi-value">
            {snapshot.averagePledge === null
              ? '—'
              : formatMoney(snapshot.averagePledge, dataset.project.currency, 2)}
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
            <p className="empty">暂无公开国家排行，未用 0 填充。</p>
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
            <p className="empty">暂无新老支持者拆分，未用 0 填充。</p>
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
            <p className="empty">暂无公开城市排行，未用 0 填充。</p>
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

      {canShowTrend(dataset) ? <Trend history={dataset.history} /> : null}

      <footer className="footer">
        <div>
          <p>
            地区仅展示公开 Top 10；无地区金额、个人支持明细与编造的历史趋势。
            {snapshot.communityPageHeaderText
              ? ` 社区页页眉 “${snapshot.communityPageHeaderText}” 不是地区数据更新时间。`
              : ' 没有把页面页眉日期当成地区更新时间。'}
          </p>
          <p>
            数据来源：Kickstarter 搜索 JSON / 项目片段 / Community。静态历史美元{' '}
            {snapshot.usdPledged ?? '—'}，现行换算{' '}
            {snapshot.convertedPledgedAmount === null
              ? '—'
              : formatGrouped(snapshot.convertedPledgedAmount)}
            ，按 fx_rate 估算{' '}
            {fxEstimate === null ? '—' : formatGrouped(fxEstimate, 2)}。三套美元口径彼此独立。
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

function Trend({ history }: { history: HistoryPoint[] }) {
  const width = 720
  const height = 200
  const values = history.map((point) => point.pledged)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const coords = history.map((point, index) => {
    const x = history.length === 1 ? width / 2 : 28 + (index / (history.length - 1)) * (width - 56)
    const y = max === min ? height / 2 : 24 + (1 - (point.pledged - min) / (max - min)) * (height - 56)
    return { x, y, point }
  })
  return (
    <section className="card trend">
      <div className="card-head">
        <h2>已筹金额（港元）</h2>
        <span className="unit">仅真实采集快照</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="已筹金额随已接受快照变化">
        <polyline points={coords.map((item) => `${item.x},${item.y}`).join(' ')} />
        {coords.map((item) => (
          <circle key={item.point.capturedAt} cx={item.x} cy={item.y} r="4" />
        ))}
      </svg>
      <p className="card-foot">
        横轴：快照日期（北京时间）{history.map((point) => point.snapshotDate).join('、')}。纵轴：已筹港元。
        来源：已接受快照，不含编造回填。
      </p>
    </section>
  )
}
