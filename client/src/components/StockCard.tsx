import { useState } from 'react'
import { StockQuote } from '../types/stock'
import { useStock } from '../context/StockContext'
import { useTheme } from '../context/ThemeContext'
import { useFavorites } from '../context/FavoritesContext'
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
  const { toggle, isFavorite } = useFavorites()
  const isPositive = quote.change >= 0
  const marketState = marketStateLabel(quote.marketState)
  const favorited = isFavorite(quote.symbol)

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
          <span style={{ fontSize: '13px', color: theme.text.secondary }}>{quote.symbol}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '13px', fontWeight: 600,
              padding: '2px 7px', borderRadius: '4px',
              background: theme.bg.input, color: marketState.color,
            }}>
              {marketState.label}
            </span>
            {quote.preMarketPrice != null && (
              <span style={{
                fontSize: '13px', fontWeight: 600,
                padding: '2px 7px', borderRadius: '4px',
                background: '#f59e0b22', color: '#f59e0b',
              }}>프리장</span>
            )}
            {quote.postMarketPrice != null && (
              <span style={{
                fontSize: '13px', fontWeight: 600,
                padding: '2px 7px', borderRadius: '4px',
                background: '#818cf822', color: '#818cf8',
              }}>애프터장</span>
            )}
            <span style={{ fontSize: '13px', fontWeight: 600, color: isPositive ? theme.up : theme.down }}>
              {formatChange(quote.change, quote.changePercent)}
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
              onClick={() => toggle(quote.symbol)}
              title={favorited ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              style={{ padding: '6px 10px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'transparent', cursor: 'pointer', fontSize: '18px', color: favorited ? '#f59e0b' : theme.text.muted, lineHeight: 1 }}
            >
              {favorited ? '★' : '☆'}
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
          <div style={{ fontSize: '15px', marginTop: '10px' }}>
            <span style={{
              fontSize: '13px', fontWeight: 600, marginRight: '6px',
              padding: '1px 5px', borderRadius: '4px',
              background: '#16a34a22', color: '#22c55e',
            }}>본장</span>
            <span style={{ color: isPositive ? theme.up : theme.down }}>
              {formatChange(quote.change, quote.changePercent)}
            </span>
          </div>
        </div>
      </div>

      {/* 프리/애프터장 — 데이터 있으면 항상 표시 */}
      {(quote.preMarketPrice || quote.postMarketPrice) && (
        <div style={{ marginTop: '8px', display: 'flex', gap: '16px', fontSize: '13px', flexWrap: 'wrap' }}>
          {quote.preMarketPrice != null && (
            <span>
              <span style={{
                fontSize: '13px', fontWeight: 600, marginRight: '6px',
                padding: '1px 5px', borderRadius: '4px',
                background: '#f59e0b22', color: '#f59e0b',
              }}>프리장</span>
              <span style={{ color: theme.text.primary }}>{quote.currency} {quote.preMarketPrice.toFixed(2)}</span>
              {' '}<span style={{ color: (quote.preMarketChange ?? 0) >= 0 ? theme.up : theme.down }}>
                {formatChange(quote.preMarketChange, quote.preMarketChangePercent)}
              </span>
            </span>
          )}
          {quote.postMarketPrice != null && (
            <span>
              <span style={{
                fontSize: '13px', fontWeight: 600, marginRight: '6px',
                padding: '1px 5px', borderRadius: '4px',
                background: '#818cf822', color: '#818cf8',
              }}>애프터장</span>
              <span style={{ color: theme.text.primary }}>{quote.currency} {quote.postMarketPrice.toFixed(2)}</span>
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
