import { chartSegments, observedPointCount, type ChartPoint } from '../../shared/history.ts'

export function HistoryChart({
  points,
  unit,
}: {
  points: ChartPoint[]
  unit: string
}) {
  const segments = chartSegments(points)
  const count = observedPointCount(points)
  if (count < 2) {
    return <p className="empty">这个字段还没有两次真实观测，所以不画趋势。</p>
  }
  const width = 720
  const height = 180
  const values = points.flatMap((point) => (point.value === null ? [] : [point.value]))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const located = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : 28 + (index / (points.length - 1)) * (width - 56)
    const y = point.value === null || max === min ? height / 2 : 24 + (1 - (point.value - min) / (max - min)) * (height - 56)
    return { ...point, x, y }
  })
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`趋势，单位 ${unit}`}>
      {segments.map((segment) => {
        const drawn = segment.map((point) => located.find((item) => item.at === point.at)).filter((item) => item && item.value !== null)
        if (drawn.length < 2) return null
        return <polyline key={drawn[0]?.at} points={drawn.map((item) => `${item?.x},${item?.y}`).join(' ')} />
      })}
      {located.filter((point) => point.value !== null).map((point) => (
        <circle key={point.at} cx={point.x} cy={point.y} r="4" />
      ))}
    </svg>
  )
}
