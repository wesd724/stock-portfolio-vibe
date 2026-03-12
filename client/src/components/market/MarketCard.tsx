import { MarketItem } from '../../types/stock'

interface Props {
  item: MarketItem
}

export default function MarketCard({ item }: Props) {
  const isPositive = item.change >= 0
  const color = isPositive ? '#22c55e' : '#ef4444'
  const sign = isPositive ? '+' : ''

  return (
    <div style={{
      background: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '10px',
      padding: '16px',
    }}>
      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>{item.label}</div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9' }}>
        {item.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </div>
      <div style={{ fontSize: '13px', color, marginTop: '4px' }}>
        {sign}{item.change?.toFixed(2)} ({sign}{item.changePercent?.toFixed(2)}%)
      </div>
    </div>
  )
}
