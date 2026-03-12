import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartPoint, ChartInterval } from '../types/stock'

interface Props {
  symbol: string
  isPositive: boolean
}

const INTERVALS: { label: string; value: ChartInterval }[] = [
  { label: '1분', value: '1m' },
  { label: '5분', value: '5m' },
  { label: '1시간', value: '1h' },
  { label: '1일', value: '1d' },
]

function formatTime(timestamp: number, interval: ChartInterval) {
  const date = new Date(timestamp)
  if (interval === '1m' || interval === '5m') {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }
  if (interval === '1h') {
    return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
  }
  return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

export default function StockChart({ symbol, isPositive }: Props) {
  const [interval, setInterval] = useState<ChartInterval>('1d')
  const [data, setData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/stocks/chart/${symbol}?interval=${interval}`)
      .then((res) => res.json())
      .then((d: ChartPoint[]) => setData(d))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [symbol, interval])

  const color = isPositive ? '#22c55e' : '#ef4444'
  const minVal = data.length ? Math.min(...data.map((d) => d.close)) : 0
  const maxVal = data.length ? Math.max(...data.map((d) => d.close)) : 0
  const padding = (maxVal - minVal) * 0.05

  return (
    <div style={{
      background: '#1e293b',
      borderRadius: '12px',
      padding: '20px 24px',
      border: '1px solid #334155',
      marginTop: '12px',
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {INTERVALS.map((item) => (
            <button
              key={item.value}
              onClick={() => setInterval(item.value)}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                background: interval === item.value ? color : '#0f172a',
                color: interval === item.value ? '#fff' : '#94a3b8',
                fontWeight: interval === item.value ? 600 : 400,
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: '12px', color: '#475569' }}>15분 지연 데이터</span>
      </div>

      {/* 차트 */}
      {loading ? (
        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
          불러오는 중...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <XAxis
              dataKey="time"
              tickFormatter={(t) => formatTime(t, interval)}
              tick={{ fill: '#475569', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minVal - padding, maxVal + padding]}
              tick={{ fill: '#475569', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => v.toFixed(2)}
              width={60}
            />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '13px' }}
              labelFormatter={(t) => formatTime(Number(t), interval)}
              formatter={(v: number) => [v.toFixed(2), '종가']}
            />
            <Line
              type="monotone"
              dataKey="close"
              stroke={color}
              dot={false}
              strokeWidth={1.5}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
