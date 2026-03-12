import { usePortfolio } from '../../context/PortfolioContext'

export default function UserInfo() {
  const { getSummary, holdings } = usePortfolio()
  const summary = getSummary()
  const isPositive = summary.gainLoss >= 0
  const hasData = holdings.length > 0

  return (
    <div style={{ padding: '20px 16px', borderBottom: '1px solid #1e293b' }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '50%', background: '#334155',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '20px', marginBottom: '12px',
      }}>
        👤
      </div>
      <div style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9' }}>사용자</div>
      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>익명</div>
      <div style={{ marginTop: '16px', padding: '12px', background: '#1e293b', borderRadius: '8px', fontSize: '13px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ color: '#64748b' }}>평가금액</span>
          <span style={{ color: '#f1f5f9', fontWeight: 600 }}>
            {hasData ? `$${summary.totalValue.toFixed(2)}` : '$0.00'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b' }}>수익률</span>
          <span style={{ color: hasData ? (isPositive ? '#22c55e' : '#ef4444') : '#64748b', fontWeight: 600 }}>
            {hasData ? `${isPositive ? '+' : ''}${summary.gainLossPercent.toFixed(2)}%` : '+0.00%'}
          </span>
        </div>
      </div>
    </div>
  )
}
