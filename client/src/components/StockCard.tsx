import { useState } from 'react'
import { StockQuote } from '../types/stock'
import { useStock } from '../context/StockContext'
import { useTheme } from '../context/ThemeContext'
import { useFavorites } from '../context/FavoritesContext'
import { usePortfolio } from '../context/PortfolioContext'
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

function formatNumberKRW(n: number | undefined) {
  if (n == null) return '-'
  if (n >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(1)}조`
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`
  return Math.round(n).toLocaleString('ko-KR')
}

function formatChange(change: number | undefined, percent: number | undefined) {
  if (change == null || percent == null) return '-'
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(2)} (${sign}${percent.toFixed(2)}%)`
}

function formatChangeKRW(changeUSD: number | undefined, percent: number | undefined, rate: number) {
  if (changeUSD == null || percent == null) return '-'
  const changeKRW = changeUSD * rate
  const sign = changeKRW >= 0 ? '+' : ''
  return `${sign}₩${Math.round(changeKRW).toLocaleString('ko-KR')} (${sign}${percent.toFixed(2)}%)`
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
  const [viewCurrency, setViewCurrency] = useState<'USD' | 'KRW'>('USD')
  const { refreshQuote } = useStock()
  const { theme } = useTheme()
  const { toggle, isFavorite } = useFavorites()
  const { currentUSDKRW } = usePortfolio()
  const isPositive = quote.change >= 0
  const marketState = marketStateLabel(quote.marketState)
  const favorited = isFavorite(quote.symbol)
  const isKRW = viewCurrency === 'KRW'
  const rate = currentUSDKRW

  function px(usd: number | undefined) {
    if (usd == null) return '-'
    return isKRW
      ? `₩ ${Math.round(usd * rate).toLocaleString('ko-KR')}`
      : `${quote.currency} ${usd.toFixed(2)}`
  }

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
              {isKRW
                ? formatChangeKRW(quote.change, quote.changePercent, rate)
                : formatChange(quote.change, quote.changePercent)}
            </span>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginTop: '4px', color: theme.text.primary }}>{quote.name}</h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end' }}>
            {/* USD/KRW 토글 */}
            <div style={{ display: 'flex', gap: '3px' }}>
              {(['USD', 'KRW'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setViewCurrency(c)}
                  style={{
                    padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${viewCurrency === c ? theme.accent : theme.border}`,
                    background: viewCurrency === c ? theme.accent + '33' : 'transparent',
                    color: viewCurrency === c ? theme.accent : theme.text.muted,
                  }}
                >{c}</button>
              ))}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: theme.text.primary }}>
              {px(quote.price)}
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
              {isKRW
                ? formatChangeKRW(quote.change, quote.changePercent, rate)
                : formatChange(quote.change, quote.changePercent)}
            </span>
          </div>
          {isKRW && (
            <div style={{ fontSize: '11px', color: theme.text.muted, marginTop: '4px' }}>
              적용 환율 {rate.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}원/달러
            </div>
          )}
        </div>
      </div>

      {/* 프리/애프터장 */}
      {(quote.preMarketPrice || quote.postMarketPrice) && (
        <div style={{ marginTop: '8px', display: 'flex', gap: '16px', fontSize: '13px', flexWrap: 'wrap' }}>
          {quote.preMarketPrice != null && (
            <span>
              <span style={{
                fontSize: '13px', fontWeight: 600, marginRight: '6px',
                padding: '1px 5px', borderRadius: '4px',
                background: '#f59e0b22', color: '#f59e0b',
              }}>프리장</span>
              <span style={{ color: theme.text.primary }}>{px(quote.preMarketPrice)}</span>
              {' '}<span style={{ color: (quote.preMarketChange ?? 0) >= 0 ? theme.up : theme.down }}>
                {isKRW
                  ? formatChangeKRW(quote.preMarketChange, quote.preMarketChangePercent, rate)
                  : formatChange(quote.preMarketChange, quote.preMarketChangePercent)}
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
              <span style={{ color: theme.text.primary }}>{px(quote.postMarketPrice)}</span>
              {' '}<span style={{ color: (quote.postMarketChange ?? 0) >= 0 ? theme.up : theme.down }}>
                {isKRW
                  ? formatChangeKRW(quote.postMarketChange, quote.postMarketChangePercent, rate)
                  : formatChange(quote.postMarketChange, quote.postMarketChangePercent)}
              </span>
            </span>
          )}
        </div>
      )}

      {/* 당일 정보 */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px',
        marginTop: '16px', padding: '12px', background: theme.bg.input, borderRadius: '8px', fontSize: '13px',
      }}>
        {[
          { label: '시가', value: px(quote.open) },
          { label: '고가', value: px(quote.dayHigh) },
          { label: '저가', value: px(quote.dayLow) },
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
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px',
        marginTop: '8px', padding: '12px', background: theme.bg.input, borderRadius: '8px', fontSize: '13px',
      }}>
        {[
          { label: '시가총액', value: isKRW ? `₩${formatNumberKRW(quote.marketCap * rate)}` : formatNumber(quote.marketCap) },
          { label: 'P/E', value: quote.trailingPE?.toFixed(2) ?? '-' },
          { label: '배당수익률', value: quote.dividendYield != null ? `${(quote.dividendYield * 100).toFixed(2)}%` : '-' },
          { label: '52주 범위', value: isKRW
            ? `${px(quote.fiftyTwoWeekLow)} ~ ${px(quote.fiftyTwoWeekHigh)}`
            : `${quote.fiftyTwoWeekLow?.toFixed(2) ?? '-'} ~ ${quote.fiftyTwoWeekHigh?.toFixed(2) ?? '-'}` },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ color: theme.text.muted }}>{label}</div>
            <div style={{ color: theme.text.primary, marginTop: '2px', fontWeight: 500 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
    {showBuy && (
      <BuyModal
        symbol={quote.symbol}
        name={quote.name}
        initialCurrency={viewCurrency}
        onClose={() => setShowBuy(false)}
      />
    )}
    </>
  )
}
