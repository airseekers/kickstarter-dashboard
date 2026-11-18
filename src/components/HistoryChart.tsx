import { chartSegments, observedPointCount, type ChartPoint } from '../../shared/history.ts'
import { formatGrouped } from '../../shared/metrics.ts'
import { shanghaiClock, shanghaiDate } from '../../shared/time.ts'

const X0 = 1.5
const X1 = 98.5
const Y_TOP = 14
const Y_BOTTOM = 86

interface Located extends ChartPoint {
  x: number
  y: number
}

function chronological(points: ChartPoint[]): ChartPoint[] {
  return [...points].sort((a, b) => {
    const left = Date.parse(a.at)
    const right = Date.parse(b.at)
    if (!Number.isFinite(left) || !Number.isFinite(right)) return 0
    return left - right
  })
}

function locate(points: ChartPoint[]): Located[] {
  const values = points.flatMap((point) => (point.value === null ? [] : [point.value]))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const times = points.map((point) => Date.parse(point.at))
  const finite = times.filter((time) => Number.isFinite(time))
  const tMin = finite.length ? Math.min(...finite) : 0
  const tMax = finite.length ? Math.max(...finite) : 0
  const useTime = finite.length === points.length && tMax > tMin
  return points.map((point, index) => {
    const xRatio = points.length === 1 ? 0.5 : useTime ? (times[index] - tMin) / (tMax - tMin) : index / (points.length - 1)
    const yRatio = point.value === null || max === min ? 0.5 : (max - point.value) / (max - min)
    return {
      ...point,
      x: X0 + xRatio * (X1 - X0),
      y: Y_TOP + yRatio * (Y_BOTTOM - Y_TOP),
    }
  })
}

function clockLabel(iso: string, withDate: boolean): string {
  const clock = shanghaiClock(iso)
  if (!withDate) return clock
  return `${shanghaiDate(iso).slice(5)} ${clock}`
}

export function HistoryChart({
  points,
  unit,
}: {
  points: ChartPoint[]
  unit: string
}) {
  const ordered = chronological(points)
  const count = observedPointCount(ordered)
  if (count < 2) {
    const only = ordered.find((point) => point.value !== null)
    return (
      <div className="trend" data-observed={count}>
        <p className="empty">
          这个字段还没有两次真实观测，所以不画趋势。历史趋势会在同一字段至少有两次真实成功观测之后显示。种子快照和失败记录不会连成曲线。
          {only && only.value !== null
            ? ` 目前已接受 ${count} 次：${shanghaiDate(only.at)} ${shanghaiClock(only.at)}，${formatGrouped(only.value)} ${unit}。`
            : ' 目前还没有当场测到的数值。'}
        </p>
      </div>
    )
  }

  const located = locate(ordered)
  const locatedByPoint = new Map(ordered.map((point, index) => [point, located[index]]))
  const values = located.flatMap((point) => (point.value === null ? [] : [point.value]))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const high = located.find((point) => point.value === max) ?? located[0]
  const low = located.find((point) => point.value === min) ?? located[0]
  const dates = located.flatMap((point) => (point.value === null ? [] : [shanghaiDate(point.at)]))
  const sameDay = dates.every((date) => date === dates[0])
  const described = located
    .flatMap((point) => (point.value === null ? [] : [`${shanghaiDate(point.at)} ${shanghaiClock(point.at)} ${formatGrouped(point.value)} ${unit}`]))
    .join('，')
  const aria = `趋势，单位 ${unit}，北京时间。${described}`
  const segments = chartSegments(ordered)
  const hasGap = ordered.some((point) => point.value === null)

  return (
    <figure className="trend" data-observed={count}>
      <p className="trend-caption">
        {sameDay ? `${dates[0]} · ` : ''}
        北京时间 UTC+8 · {count} 个已接受观测
      </p>
      <div className="trend-frame">
        <div className="trend-y" aria-hidden="true">
          <span style={{ top: `${high.y}%` }}>{formatGrouped(max)}</span>
          {max !== min ? <span style={{ top: `${low.y}%` }}>{formatGrouped(min)}</span> : null}
        </div>
        <div className="trend-main">
          <div className="trend-plot">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={aria}>
              <title>{aria}</title>
              <line className="grid" x1={X0} y1={high.y} x2={X1} y2={high.y} />
              {max !== min ? <line className="grid" x1={X0} y1={low.y} x2={X1} y2={low.y} /> : null}
              {segments.map((segment, index) => {
                const drawn = segment
                  .map((point) => locatedByPoint.get(point))
                  .filter((point): point is Located => point !== undefined && point.value !== null)
                if (drawn.length < 2) return null
                return (
                  <polyline
                    key={`${drawn[0].at}-${index}`}
                    points={drawn.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ')}
                  />
                )
              })}
            </svg>
            {located.flatMap((point, index) => (
              point.value === null ? [] : [(
                <span
                  key={`${point.at}-${index}`}
                  className="trend-mark"
                  data-value={point.value}
                  data-at={point.at}
                  style={{ left: `${point.x.toFixed(2)}%`, top: `${point.y.toFixed(2)}%` }}
                  title={`${shanghaiDate(point.at)} ${shanghaiClock(point.at)} 北京时间，${formatGrouped(point.value)} ${unit}`}
                  aria-hidden="true"
                />
              )]
            ))}
          </div>
          <div className="trend-x">
            <time dateTime={ordered[0].at}>{clockLabel(ordered[0].at, !sameDay)}</time>
            <time dateTime={ordered[ordered.length - 1].at}>{clockLabel(ordered[ordered.length - 1].at, !sameDay)}</time>
          </div>
        </div>
      </div>
      <ol className="trend-values">
        {ordered.map((point, index) => (
          <li key={`${point.at}-${index}`}>
            <time dateTime={point.at}>{clockLabel(point.at, !sameDay)}</time>
            {point.value === null ? <span className="missing">缺失</span> : <strong>{formatGrouped(point.value)}</strong>}
            {point.value === null ? null : <span>{unit}</span>}
          </li>
        ))}
      </ol>
      {hasGap ? <p className="trend-note">中间有未测到的人数，曲线在这里断开，不补 0。</p> : null}
    </figure>
  )
}
