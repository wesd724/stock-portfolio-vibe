import { useState, useEffect } from 'react'
import { MarketItem } from '../../types/stock'
import MarketCard from './MarketCard'

export default function MarketOverview() {
  const [items, setItems] = useState<MarketItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/market/overview')
      .then((res) => res.json())
      .then((data: MarketItem[]) => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p style={{ color: '#475569', fontSize: '15px' }}>시장 정보를 불러오는 중...</p>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9' }}>시장 현황</h2>
        <span style={{ fontSize: '12px', color: '#475569' }}>15분 지연 데이터</span>
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
