import { useState } from 'react'
import { StockQuote } from '../types/stock'
import { useStock } from '../context/StockContext'
import { useTheme } from '../context/ThemeContext'
import { useFavorites } from '../context/FavoritesContext'
import { usePortfolio } from '../context/PortfolioContext'
import { useWindowSize } from '../hooks/useWindowSize'
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

function marketStateLabel(state: string, regularMarketTime?: number | null) {
  if (state === 'CLOSED') {
    const isToday = regularMarketTime != null &&
      new Date(regularMarketTime).toDateString() === new Date().toDateString()
    return isToday
      ? { label: '장마감', color: '#64748b' }
      : { label: '휴장', color: '#64748b' }
  }
  const map: Record<string, { label: string; color: string }> = {
    REGULAR:  { label: '본장',    color: '#22c55e' },
    PRE:      { label: '프리장',  color: '#f59e0b' },
    PREPRE:   { label: '프리장',  color: '#f59e0b' },
    POST:     { label: '애프터장', color: '#818cf8' },
    POSTPOST: { label: '애프터장', color: '#818cf8' },
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
  const { isMobile } = useWindowSize()
  const isPositive = quote.change >= 0
  const marketState = marketStateLabel(quote.marketState, quote.regularMarketTime)
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
      padding: isMobile ? '16px' : '20px 24px',
      border: `1px solid ${theme.border}`,
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : 0,
      }}>
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
            {(() => {
              const isPre  = quote.marketState === 'PRE'  || quote.marketState === 'PREPRE'
              const isPost = quote.marketState === 'POST' || quote.marketState === 'POSTPOST'
              const change  = isPre ? quote.preMarketChange  : isPost ? quote.postMarketChange  : quote.change
              const pct     = isPre ? quote.preMarketChangePercent : isPost ? quote.postMarketChangePercent : quote.changePercent
              const pos     = (change ?? 0) >= 0
              if (change == null && pct == null) return null
              return (
                <span style={{ fontSize: '13px', fontWeight: 600, color: pos ? theme.up : theme.down }}>
                  {isKRW
                    ? formatChangeKRW(change, pct, rate)
                    : formatChange(change, pct)}
                </span>
              )
            })()}
          </div>
          <h2 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 600, marginTop: '4px', color: theme.text.primary }}>{quote.name}</h2>
        </div>
        <div style={{ textAlign: isMobile ? 'left' : 'right', width: isMobile ? '100%' : 'auto' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            justifyContent: isMobile ? 'flex-start' : 'flex-end',
            flexWrap: 'wrap',
          }}>
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
            {/* 현재 장 기준 가격 */}
            <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: theme.text.primary }}>
              {(() => {
                const isPre  = quote.marketState === 'PRE'  || quote.marketState === 'PREPRE'
                const isPost = quote.marketState === 'POST' || quote.marketState === 'POSTPOST'
                const currentPrice = isPre ? quote.preMarketPrice : isPost ? quote.postMarketPrice : quote.price
                return px(currentPrice)
              })()}
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
          {/* 프리/애프터장일 때 본장 종가 명시 */}
          {(quote.marketState === 'PRE' || quote.marketState === 'PREPRE' ||
            quote.marketState === 'POST' || quote.marketState === 'POSTPOST') && (
            <div style={{ fontSize: '12px', color: theme.text.muted, marginTop: '4px', textAlign: isMobile ? 'left' : 'right' }}>
              본장 종가 {px(quote.price)}
            </div>
          )}
          {isKRW && (
            <div style={{ fontSize: '11px', color: theme.text.muted, marginTop: '2px', textAlign: isMobile ? 'left' : 'right' }}>
              적용 환율 {rate.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}원/달러
            </div>
          )}
        </div>
      </div>


      {/* 당일 정보 */}
      <div style={{
        display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px',
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
        display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px',
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
