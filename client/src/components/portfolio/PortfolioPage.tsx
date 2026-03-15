import { useEffect } from 'react'
import { usePortfolio } from '../../context/PortfolioContext'
import { useStock } from '../../context/StockContext'
import { useNavigation } from '../../context/NavigationContext'
import { useTheme } from '../../context/ThemeContext'
import { useWindowSize } from '../../hooks/useWindowSize'

function formatKRW(amount: number): string {
  return '₩' + Math.round(amount).toLocaleString('ko-KR')
}

function formatUSD(amount: number): string {
  return '$' + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function PortfolioPage() {
  const { holdings, refreshCurrentPrices, displayCurrency, toggleDisplayCurrency } = usePortfolio()
  const { setSelectedQuote } = useStock()
  const { setPage } = useNavigation()
  const { theme } = useTheme()
  const { isMobile } = useWindowSize()

  const isKRW = displayCurrency === 'KRW'

  const totalCost = holdings.reduce((s, h) => s + h.totalCost, 0)
  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0)
  const gainLoss = totalValue - totalCost
  const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0
  const totalCostKrw = holdings.reduce((s, h) => s + h.totalCostKrw, 0)
  const totalValueKrw = holdings.reduce((s, h) => s + h.currentValueKrw, 0)
  const gainLossKrw = totalValueKrw - totalCostKrw
  const gainLossPercentKrw = totalCostKrw > 0 ? (gainLossKrw / totalCostKrw) * 100 : 0

  const summaryGainLoss = isKRW ? gainLossKrw : gainLoss
  const summaryGainLossPercent = isKRW ? gainLossPercentKrw : gainLossPercent
  const isPositive = summaryGainLoss >= 0

  const summaryCards = isKRW
    ? [
        { label: '총 투자금', value: formatKRW(totalCostKrw) },
        { label: '평가금액', value: formatKRW(totalValueKrw) },
        { label: '평가손익', value: `${isPositive ? '+' : ''}${formatKRW(summaryGainLoss)}`, color: isPositive ? theme.up : theme.down },
        { label: '수익률', value: `${isPositive ? '+' : ''}${summaryGainLossPercent.toFixed(2)}%`, color: isPositive ? theme.up : theme.down },
      ]
    : [
        { label: '총 투자금', value: formatUSD(totalCost) },
        { label: '평가금액', value: formatUSD(totalValue) },
        { label: '평가손익', value: `${isPositive ? '+' : ''}${formatUSD(summaryGainLoss)}`, color: isPositive ? theme.up : theme.down },
        { label: '수익률', value: `${isPositive ? '+' : ''}${summaryGainLossPercent.toFixed(2)}%`, color: isPositive ? theme.up : theme.down },
      ]

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
    return (
      <div style={{ background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '48px', textAlign: 'center', color: theme.text.muted, fontSize: '14px' }}>
        보유 종목이 없습니다. 종목을 검색해 매수해보세요.
      </div>
    )
  }

  const tableHeaders = isKRW
    ? ['종목', '보유수량', '평균단가(USD)', '현재가(USD)', '평가금액', '손익', '수익률', '환차손익', '가격손익']
    : ['종목', '보유수량', '평균단가', '현재가', '평가금액', '손익', '수익률']

  return (
    <div>
      {/* 헤더 영역: 통화 토글 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['KRW', 'USD'] as const).map((c) => (
            <button
              key={c}
              onClick={toggleDisplayCurrency}
              style={{
                padding: '5px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${displayCurrency === c ? theme.up : theme.border}`,
                background: displayCurrency === c ? theme.upBg : 'transparent',
                color: displayCurrency === c ? theme.up : theme.text.secondary,
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* 요약 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {summaryCards.map(({ label, value, color }) => (
          <div key={label} style={{ background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: theme.text.muted, marginBottom: '6px' }}>{label}</div>
            <div style={{ fontSize: isMobile ? '15px' : '18px', fontWeight: 700, color: color ?? theme.text.primary }}>{value}</div>
          </div>
        ))}
      </div>

      {/* 보유 종목 테이블 */}
      <div style={{ background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: isKRW ? '800px' : '560px', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: theme.bg.input, color: theme.text.muted }}>
                {tableHeaders.map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const gainLossVal = isKRW ? h.gainLossKrw : h.gainLoss
                const gainLossPercentVal = isKRW ? h.gainLossPercentKrw : h.gainLossPercent
                const pos = gainLossVal >= 0
                const valueDisplay = isKRW ? formatKRW(h.currentValueKrw) : formatUSD(h.currentValue)
                const gainLossDisplay = isKRW
                  ? `${pos ? '+' : ''}${formatKRW(gainLossVal)}`
                  : `${pos ? '+' : ''}${formatUSD(gainLossVal)}`

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
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: theme.text.primary }}>${h.avgCostPerShare.toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: theme.text.primary }}>${h.currentPrice.toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: theme.text.primary }}>{valueDisplay}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: pos ? theme.up : theme.down }}>
                      {gainLossDisplay}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: pos ? theme.up : theme.down }}>
                      {pos ? '+' : ''}{gainLossPercentVal.toFixed(2)}%
                    </td>
                    {isKRW && (
                      <>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: h.fxGainLossKrw >= 0 ? theme.up : theme.down }}>
                          {h.fxGainLossKrw >= 0 ? '+' : ''}{formatKRW(h.fxGainLossKrw)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: h.priceGainLossKrw >= 0 ? theme.up : theme.down }}>
                          {h.priceGainLossKrw >= 0 ? '+' : ''}{formatKRW(h.priceGainLossKrw)}
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
