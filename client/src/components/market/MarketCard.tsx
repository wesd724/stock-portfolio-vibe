import { useState } from 'react'
import { MarketItem, StockQuote } from '../../types/stock'
import { useTheme } from '../../context/ThemeContext'
import { useStock } from '../../context/StockContext'
import { useNavigation } from '../../context/NavigationContext'

interface Props {
  item: MarketItem
}

export default function MarketCard({ item }: Props) {
  const { theme } = useTheme()
  const { setSelectedQuote } = useStock()
  const { setPage } = useNavigation()
  const [loading, setLoading] = useState(false)
  const isPositive = item.change >= 0
  const color = isPositive ? theme.up : theme.down
  const sign = isPositive ? '+' : ''

  async function handleClick() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/stocks/quote/${item.symbol}`)
      if (!res.ok) return
      const data: StockQuote = await res.json()
      setSelectedQuote(data)
      setPage('home')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={handleClick}
      style={{
        background: theme.bg.card,
        border: `1px solid ${theme.border}`,
        borderRadius: '10px',
        padding: '16px',
        cursor: loading ? 'wait' : 'pointer',
        opacity: loading ? 0.6 : 1,
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = theme.bg.hover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = theme.bg.card)}
    >
      <div style={{ fontSize: '12px', color: theme.text.muted, marginBottom: '6px' }}>{item.label}</div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: theme.text.primary }}>
        {item.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </div>
      <div style={{ fontSize: '13px', color, marginTop: '4px' }}>
        {sign}{item.change?.toFixed(2)} ({sign}{item.changePercent?.toFixed(2)}%)
      </div>
    </div>
  )
}
