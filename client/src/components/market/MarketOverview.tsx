import { useState, useEffect } from 'react'
import { MarketItem } from '../../types/stock'
import MarketCard from './MarketCard'
import { useTheme } from '../../context/ThemeContext'

interface PutCallItem { symbol: string; ratio: number | null }

export default function MarketOverview() {
  const [items, setItems] = useState<MarketItem[]>([])
  const [putCall, setPutCall] = useState<PutCallItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { theme } = useTheme()

  function fetchData(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    Promise.all([
      fetch('/api/market/overview').then((r) => r.json()),
      fetch('/api/market/putcall').then((r) => r.json()),
    ])
      .then(([overview, pc]) => { setItems(overview); setPutCall(pc) })
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false) })
  }

  useEffect(() => { fetchData() }, [])

  if (loading) {
    return <p style={{ color: theme.text.muted, fontSize: '15px' }}>시장 정보를 불러오는 중...</p>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: theme.text.primary }}>시장 현황</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            title="새로고침"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text.muted, fontSize: '16px', padding: '2px' }}
          >
            {refreshing ? '⟳' : '↻'}
          </button>
          <span style={{ fontSize: '12px', color: theme.text.muted }}>15분 지연 데이터</span>
        </div>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '12px',
      }}>
        {items.map((item) => (
          <MarketCard key={item.symbol} item={item} />
        ))}
      </div>

      {/* 풋콜 비율 */}
      {putCall.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: theme.text.secondary, marginBottom: '10px' }}>
            풋/콜 비율
            <span style={{ fontSize: '11px', fontWeight: 400, color: theme.text.muted, marginLeft: '8px' }}>
              전체 만기 기준 · 1 초과 = 풋 우세 (약세), 1 미만 = 콜 우세 (강세)
            </span>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {putCall.map(({ symbol, ratio }) => {
              const bearish = ratio != null && ratio > 1
              const bullish = ratio != null && ratio < 1
              const color = bearish ? theme.down : bullish ? theme.up : theme.text.muted
              const sentiment = bearish ? '약세' : bullish ? '강세' : '-'
              return (
                <div key={symbol} style={{
                  background: theme.bg.card, border: `1px solid ${theme.border}`,
                  borderRadius: '10px', padding: '14px 20px',
                  display: 'flex', alignItems: 'center', gap: '16px',
                }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: theme.text.primary }}>{symbol}</span>
                  <span style={{ fontSize: '22px', fontWeight: 700, color }}>
                    {ratio != null ? ratio.toFixed(2) : '-'}
                  </span>
                  <span style={{ fontSize: '12px', color, fontWeight: 600 }}>{sentiment}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
