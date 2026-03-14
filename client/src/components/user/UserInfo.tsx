import { usePortfolio } from '../../context/PortfolioContext'
import { useTheme } from '../../context/ThemeContext'

export default function UserInfo() {
  const { getSummary, holdings } = usePortfolio()
  const { theme } = useTheme()
  const summary = getSummary()
  const isPositive = summary.gainLoss >= 0
  const hasData = holdings.length > 0

  return (
    <div style={{ padding: '20px 16px', borderBottom: `1px solid ${theme.bg.card}` }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '50%', background: theme.border,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '20px', marginBottom: '12px',
      }}>
        👤
      </div>
      <div style={{ fontSize: '15px', fontWeight: 600, color: theme.text.primary }}>사용자</div>
      <div style={{ fontSize: '12px', color: theme.text.muted, marginTop: '2px' }}>익명</div>
      <div style={{ marginTop: '16px', padding: '12px', background: theme.bg.card, borderRadius: '8px', fontSize: '13px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ color: theme.text.muted }}>평가금액</span>
          <span style={{ color: theme.text.primary, fontWeight: 600 }}>
            {hasData ? `$${summary.totalValue.toFixed(2)}` : '$0.00'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: theme.text.muted }}>수익률</span>
          <span style={{ color: hasData ? (isPositive ? theme.up : theme.down) : theme.text.muted, fontWeight: 600 }}>
            {hasData ? `${isPositive ? '+' : ''}${summary.gainLossPercent.toFixed(2)}%` : '+0.00%'}
          </span>
        </div>
      </div>
    </div>
  )
}
