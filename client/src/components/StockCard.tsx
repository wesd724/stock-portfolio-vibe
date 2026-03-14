import { useState } from 'react'
import { StockQuote } from '../types/stock'
import { useStock } from '../context/StockContext'
import { useTheme } from '../context/ThemeContext'
import BuyModal from './portfolio/BuyModal'

interface Props {
  quote: StockQuote
}

function formatNumber(n: number | undefined) {
  if (n == null) return '-'
  if (n >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(2)}T`
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  return n.toLocaleString()
}

function formatChange(change: number | undefined, percent: number | undefined) {
  if (change == null || percent == null) return '-'
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(2)} (${sign}${percent.toFixed(2)}%)`
}

function marketStateLabel(state: string) {
  const map: Record<string, { label: string; color: string }> = {
    REGULAR: { label: '본장', color: '#22c55e' },
    PRE: { label: '프리장', color: '#f59e0b' },
    PREPRE: { label: '프리장', color: '#f59e0b' },
    POST: { label: '애프터장', color: '#818cf8' },
    POSTPOST: { label: '애프터장', color: '#818cf8' },
    CLOSED: { label: '장마감', color: '#64748b' },
  }
  return map[state] ?? { label: state, color: '#64748b' }
}

export default function StockCard({ quote }: Props) {
  const [showBuy, setShowBuy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const { refreshQuote } = useStock()
  const { theme } = useTheme()
  const isPositive = quote.change >= 0
  const marketState = marketStateLabel(quote.marketState)

  async function handleRefresh() {
    setRefreshing(true)
    await refreshQuote()
    setRefreshing(false)
  }

  return (
    <>
    <div style={{
      background: theme.bg.card,
      borderRadius: '12px',
      padding: '20px 24px',
      border: `1px solid ${theme.border}`,
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: theme.text.secondary }}>{quote.symbol}</span>
            <span style={{
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '4px',
              background: theme.bg.input,
              color: marketState.color,
            }}>
              {marketState.label}
            </span>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginTop: '4px', color: theme.text.primary }}>{quote.name}</h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: theme.text.primary }}>
              {quote.currency} {quote.price?.toFixed(2)}
            </div>
            <button
              onClick={() => setShowBuy(true)}
              style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: theme.up, color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
            >
              매수
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="최신 정보로 업데이트"
              style={{ padding: '6px 10px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'transparent', color: theme.text.secondary, cursor: 'pointer', fontSize: '16px' }}
            >
              ↻
            </button>
          </div>
          <div style={{ color: isPositive ? theme.up : theme.down, fontSize: '15px', marginTop: '2px' }}>
            {formatChange(quote.change, quote.changePercent)}
          </div>
        </div>
      </div>

      {/* 프리/애프터장 */}
      {quote.marketState !== 'REGULAR' && (quote.preMarketPrice || quote.postMarketPrice) && (
        <div style={{ marginTop: '8px', fontSize: '13px', color: theme.text.secondary }}>
          {quote.marketState === 'PRE' || quote.marketState === 'PREPRE' ? (
            <span>
              프리장: <span style={{ color: theme.text.primary }}>{quote.currency} {quote.preMarketPrice?.toFixed(2)}</span>
              {' '}<span style={{ color: (quote.preMarketChange ?? 0) >= 0 ? theme.up : theme.down }}>
                {formatChange(quote.preMarketChange, quote.preMarketChangePercent)}
              </span>
            </span>
          ) : (
            <span>
              애프터장: <span style={{ color: theme.text.primary }}>{quote.currency} {quote.postMarketPrice?.toFixed(2)}</span>
              {' '}<span style={{ color: (quote.postMarketChange ?? 0) >= 0 ? theme.up : theme.down }}>
                {formatChange(quote.postMarketChange, quote.postMarketChangePercent)}
              </span>
            </span>
          )}
        </div>
      )}

      {/* 당일 정보 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginTop: '16px',
        padding: '12px',
        background: theme.bg.input,
        borderRadius: '8px',
        fontSize: '13px',
      }}>
        {[
          { label: '시가', value: quote.open?.toFixed(2) ?? '-' },
          { label: '고가', value: quote.dayHigh?.toFixed(2) ?? '-' },
          { label: '저가', value: quote.dayLow?.toFixed(2) ?? '-' },
          { label: '거래량', value: formatNumber(quote.volume) },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ color: theme.text.muted }}>{label}</div>
            <div style={{ color: theme.text.primary, marginTop: '2px', fontWeight: 500 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* 추가 지표 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginTop: '8px',
        padding: '12px',
        background: theme.bg.input,
        borderRadius: '8px',
        fontSize: '13px',
      }}>
        {[
          { label: '시가총액', value: formatNumber(quote.marketCap) },
          { label: 'P/E', value: quote.trailingPE?.toFixed(2) ?? '-' },
          { label: '배당수익률', value: quote.dividendYield != null ? `${(quote.dividendYield * 100).toFixed(2)}%` : '-' },
          { label: '52주 범위', value: `${quote.fiftyTwoWeekLow?.toFixed(2) ?? '-'} ~ ${quote.fiftyTwoWeekHigh?.toFixed(2) ?? '-'}` },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ color: theme.text.muted }}>{label}</div>
            <div style={{ color: theme.text.primary, marginTop: '2px', fontWeight: 500 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
    {showBuy && <BuyModal symbol={quote.symbol} name={quote.name} onClose={() => setShowBuy(false)} />}
    </>
  )
}
