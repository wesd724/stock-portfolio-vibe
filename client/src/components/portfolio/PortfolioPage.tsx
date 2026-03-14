import { useEffect } from 'react'
import { usePortfolio } from '../../context/PortfolioContext'
import { useStock } from '../../context/StockContext'
import { useNavigation } from '../../context/NavigationContext'
import { useTheme } from '../../context/ThemeContext'
import { computeSummary } from '../../utils/portfolioCalc'

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function PortfolioPage() {
  const { holdings, refreshCurrentPrices } = usePortfolio()
  const { setSelectedQuote } = useStock()
  const { setPage } = useNavigation()
  const { theme } = useTheme()
  const summary = computeSummary(holdings)
  const isPositive = summary.gainLoss >= 0

  useEffect(() => { refreshCurrentPrices() }, [])

  async function handleRowClick(symbol: string) {
    const res = await fetch(`/api/stocks/quote/${symbol}`)
    if (res.ok) {
      const data = await res.json()
      setSelectedQuote(data)
      setPage('home')
    }
  }

  if (holdings.length === 0) {
    return <p style={{ color: theme.text.muted, fontSize: '15px' }}>보유 종목이 없습니다. 종목을 검색해 매수해보세요.</p>
  }

  return (
    <div>
      {/* 요약 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: '총 투자금', value: `$${fmt(summary.totalCost)}` },
          { label: '평가금액', value: `$${fmt(summary.totalValue)}` },
          { label: '평가손익', value: `${isPositive ? '+' : ''}$${fmt(summary.gainLoss)}`, color: isPositive ? theme.up : theme.down },
          { label: '수익률', value: `${isPositive ? '+' : ''}${fmt(summary.gainLossPercent)}%`, color: isPositive ? theme.up : theme.down },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: theme.text.muted, marginBottom: '6px' }}>{label}</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: color ?? theme.text.primary }}>{value}</div>
          </div>
        ))}
      </div>

      {/* 보유 종목 테이블 */}
      <div style={{ background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: theme.bg.input, color: theme.text.muted }}>
              {['종목', '보유수량', '평균단가', '현재가', '평가금액', '손익', '수익률'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => {
              const pos = h.gainLoss >= 0
              return (
                <tr
                  key={h.symbol}
                  onClick={() => handleRowClick(h.symbol)}
                  style={{ borderTop: `1px solid ${theme.border}`, cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = theme.bg.hover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: theme.text.primary }}>{h.symbol}</div>
                    <div style={{ color: theme.text.muted, fontSize: '11px' }}>{h.name}</div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: theme.text.primary }}>{h.totalShares.toFixed(4)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: theme.text.primary }}>${fmt(h.avgCostPerShare)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: theme.text.primary }}>${fmt(h.currentPrice)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: theme.text.primary }}>${fmt(h.currentValue)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: pos ? theme.up : theme.down }}>
                    {pos ? '+' : ''}${fmt(h.gainLoss)}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: pos ? theme.up : theme.down }}>
                    {pos ? '+' : ''}{fmt(h.gainLossPercent)}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
