import { useState, useEffect } from 'react'
import { MarketItem } from '../../types/stock'
import MarketCard from './MarketCard'
import { useTheme } from '../../context/ThemeContext'

export default function MarketOverview() {
  const [items, setItems] = useState<MarketItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { theme } = useTheme()

  function fetchData(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    fetch('/api/market/overview')
      .then((res) => res.json())
      .then((data: MarketItem[]) => setItems(data))
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
    </div>
  )
}
