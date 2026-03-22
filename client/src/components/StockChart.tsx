import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartPoint, ChartInterval } from '../types/stock'
import { useTheme } from '../context/ThemeContext'

interface Props {
  symbol: string
  isPositive: boolean
}

const INTERVALS: { label: string; value: ChartInterval }[] = [
  { label: '1분',  value: '1m'   },
  { label: '5분',  value: '5m'   },
  { label: '15분', value: '15m'  },
  { label: '1시간', value: '1h'  },
  { label: '1일',  value: '1d'   },
  { label: '1주',  value: '1wk'  },
  { label: '1달',  value: '1mo'  },
  { label: '12달', value: '12mo' },
]

function formatTime(timestamp: number, interval: ChartInterval, full = false) {
  const date = new Date(timestamp)
  if (interval === '1m' || interval === '5m' || interval === '15m') {
    return full
      ? date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) + ' ' +
        date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }
  if (interval === '1h') {
    return full
      ? date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' }) + ' ' +
        date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
  }
  if (interval === '1mo' || interval === '12mo') {
    return full
      ? date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric' })
      : date.toLocaleDateString('ko-KR', { year: '2-digit', month: 'numeric' })
  }
  // 1d, 1wk
  return full
    ? date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' })
    : date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

export default function StockChart({ symbol, isPositive }: Props) {
  const [interval, setInterval] = useState<ChartInterval>('1d')
  const [data, setData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const { theme } = useTheme()

  function fetchChart(sym: string, intv: ChartInterval, isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    fetch(`/api/stocks/chart/${sym}?interval=${intv}`)
      .then((res) => res.json())
      .then((d: ChartPoint[]) => setData(d))
      .catch(() => setData([]))
      .finally(() => { setLoading(false); setRefreshing(false) })
  }

  useEffect(() => { fetchChart(symbol, interval) }, [symbol, interval])

  const color = isPositive ? theme.up : theme.down
  const minVal = data.length ? Math.min(...data.map((d) => d.close)) : 0
  const maxVal = data.length ? Math.max(...data.map((d) => d.close)) : 0
  const padding = (maxVal - minVal) * 0.05

  return (
    <div style={{
      background: theme.bg.card,
      borderRadius: '12px',
      padding: '20px 24px',
      border: `1px solid ${theme.border}`,
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
                background: interval === item.value ? color : theme.bg.input,
                color: interval === item.value ? '#fff' : theme.text.secondary,
                fontWeight: interval === item.value ? 600 : 400,
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => fetchChart(symbol, interval, true)}
            disabled={refreshing || loading}
            title="새로고침"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text.muted, fontSize: '16px', padding: '2px' }}
          >
            {refreshing ? '⟳' : '↻'}
          </button>
          <span style={{ fontSize: '12px', color: theme.text.muted }}>15분 지연 데이터</span>
        </div>
      </div>

      {/* 차트 */}
      {loading ? (
        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.text.muted }}>
          불러오는 중...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <XAxis
              dataKey="time"
              tickFormatter={(t) => formatTime(t, interval)}
              tick={{ fill: theme.text.muted, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minVal - padding, maxVal + padding]}
              tick={{ fill: theme.text.muted, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              width={60}
            />
            <Tooltip
              contentStyle={{ background: theme.bg.input, border: `1px solid ${theme.border}`, borderRadius: '8px', fontSize: '13px' }}
              labelFormatter={(t) => formatTime(Number(t), interval, true)}
              formatter={(v) => [(v as number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), '종가']}
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
