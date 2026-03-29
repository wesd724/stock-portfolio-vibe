import { useState } from 'react'
import { Holding } from '../../types/portfolio'
import { useStock } from '../../context/StockContext'
import { useNavigation } from '../../context/NavigationContext'
import { useTheme } from '../../context/ThemeContext'
import { usePortfolio } from '../../context/PortfolioContext'
import SellModal from './SellModal'

interface Props {
  holding: Holding
}

function formatKRW(amount: number): string {
  return '₩' + Math.round(amount).toLocaleString('ko-KR')
}

function formatUSD(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function HoldingItem({ holding }: Props) {
  const [showSell, setShowSell] = useState(false)
  const { setSelectedQuote } = useStock()
  const { setPage } = useNavigation()
  const { theme } = useTheme()
  const { transactions, displayCurrency } = usePortfolio()

  const symbolTxs = transactions.filter((t) => t.symbol === holding.symbol)
  const earliestBuyDate = symbolTxs
    .filter((t) => t.type === 'BUY')
    .map((t) => t.date)
    .sort()[0] ?? '1980-01-01'
  const stockCurrency = symbolTxs[0]?.stockCurrency ?? 'USD'

  const isKRW = displayCurrency === 'KRW'
  const gainLoss = isKRW ? holding.gainLossKrw : holding.gainLoss
  const isPositive = gainLoss >= 0
  const gainLossPercent = isKRW ? holding.gainLossPercentKrw : holding.gainLossPercent
  const valueDisplay = isKRW ? formatKRW(holding.currentValueKrw) : formatUSD(holding.currentValue)

  async function handleClick() {
    setPage('home')
    const res = await fetch(`/api/stocks/quote/${holding.symbol}`)
    if (res.ok) {
      const data = await res.json()
      setSelectedQuote(data)
    }
  }

  return (
    <>
      <div style={{ borderBottom: `1px solid ${theme.bg.card}` }}>
        <div
          onClick={handleClick}
          style={{ padding: '10px 16px 6px', cursor: 'pointer' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = theme.bg.hover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: theme.text.primary }}>{holding.symbol}</span>
              <div style={{ fontSize: '11px', color: theme.text.muted, marginTop: '1px' }}>{holding.totalShares.toFixed(4)}주</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', color: theme.text.primary }}>{valueDisplay}</div>
              <div style={{ fontSize: '11px', color: isPositive ? theme.up : theme.down }}>
                {isPositive ? '+' : ''}{gainLossPercent.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding: '0 16px 8px' }}>
          <button
            onClick={() => setShowSell(true)}
            style={{ width: '100%', padding: '4px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: 'transparent', color: theme.text.secondary, cursor: 'pointer', fontSize: '11px' }}
          >
            매도
          </button>
        </div>
      </div>

      {showSell && (
        <SellModal
          symbol={holding.symbol}
          name={holding.name}
          maxShares={holding.totalShares}
          minDate={earliestBuyDate}
          stockCurrency={stockCurrency}
          onClose={() => setShowSell(false)}
        />
      )}
    </>
  )
}
