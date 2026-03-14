import { MarketItem } from '../../types/stock'
import { useTheme } from '../../context/ThemeContext'

interface Props {
  item: MarketItem
}

export default function MarketCard({ item }: Props) {
  const { theme } = useTheme()
  const isPositive = item.change >= 0
  const color = isPositive ? theme.up : theme.down
  const sign = isPositive ? '+' : ''

  return (
    <div style={{
      background: theme.bg.card,
      border: `1px solid ${theme.border}`,
      borderRadius: '10px',
      padding: '16px',
    }}>
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
