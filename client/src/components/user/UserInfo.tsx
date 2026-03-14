import { usePortfolio } from '../../context/PortfolioContext'
import { useTheme } from '../../context/ThemeContext'

function formatKRW(amount: number): string {
  return '₩' + Math.round(amount).toLocaleString('ko-KR')
}

function formatUSD(amount: number): string {
  return '$' + amount.toFixed(2)
}

export default function UserInfo() {
  const { getSummary, holdings, displayCurrency, toggleDisplayCurrency } = usePortfolio()
  const { theme } = useTheme()
  const summary = getSummary()
  const hasData = holdings.length > 0

  const isKRW = displayCurrency === 'KRW'
  const isPositive = isKRW ? summary.gainLossKrw >= 0 : summary.gainLoss >= 0

  const totalCostDisplay = hasData
    ? (isKRW ? formatKRW(summary.totalCostKrw) : formatUSD(summary.totalCost))
    : (isKRW ? '₩0' : '$0.00')

  const totalValueDisplay = hasData
    ? (isKRW ? formatKRW(summary.totalValueKrw) : formatUSD(summary.totalValue))
    : (isKRW ? '₩0' : '$0.00')

  const gainLossPercent = hasData
    ? (isKRW ? summary.gainLossPercentKrw : summary.gainLossPercent)
    : 0

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

      {/* 통화 토글 */}
      <div style={{ display: 'flex', gap: '4px', marginTop: '12px' }}>
        {(['KRW', 'USD'] as const).map((c) => (
          <button
            key={c}
            onClick={toggleDisplayCurrency}
            style={{
              padding: '3px 10px', borderRadius: '5px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${displayCurrency === c ? theme.up : theme.border}`,
              background: displayCurrency === c ? theme.upBg : 'transparent',
              color: displayCurrency === c ? theme.up : theme.text.muted,
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <div style={{ marginTop: '10px', padding: '12px', background: theme.bg.card, borderRadius: '8px', fontSize: '13px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ color: theme.text.muted }}>총 투자금</span>
          <span style={{ color: theme.text.primary, fontWeight: 600 }}>{totalCostDisplay}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ color: theme.text.muted }}>평가금액</span>
          <span style={{ color: theme.text.primary, fontWeight: 600 }}>{totalValueDisplay}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: theme.text.muted }}>수익률</span>
          <span style={{ color: hasData ? (isPositive ? theme.up : theme.down) : theme.text.muted, fontWeight: 600 }}>
            {hasData ? `${isPositive ? '+' : ''}${gainLossPercent.toFixed(2)}%` : '+0.00%'}
          </span>
        </div>
      </div>
    </div>
  )
}
