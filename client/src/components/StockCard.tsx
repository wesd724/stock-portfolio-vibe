import { useState, useEffect } from 'react'
import { StockQuote } from '../types/stock'
import { useStock } from '../context/StockContext'
import { useTheme } from '../context/ThemeContext'
import { useFavorites } from '../context/FavoritesContext'
import { usePortfolio } from '../context/PortfolioContext'
import { useWindowSize } from '../hooks/useWindowSize'
import BuyModal from './portfolio/BuyModal'

const MARKET_OVERVIEW_SYMBOLS = new Set([
  'NQ=F', 'ES=F', 'YM=F', 'RTY=F',
  'KRW=X', 'DX=F', '2YY=F', '^TNX', '^VIX',
  'GC=F', 'SI=F', 'CL=F',
  '^KS11', '^KQ11',
  'BTC-USD', 'ETH-USD',
])

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
  return `${sign}${change.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${sign}${percent.toFixed(2)}%)`
}

function formatChangeKRW(changeUSD: number | undefined, percent: number | undefined, rate: number) {
  if (changeUSD == null || percent == null) return '-'
  const changeKRW = changeUSD * rate
  const sign = changeKRW >= 0 ? '+' : ''
  return `${sign}₩${Math.round(changeKRW).toLocaleString('ko-KR')} (${sign}${percent.toFixed(2)}%)`
}

function marketStateLabel(state: string, regularMarketTime?: number | null) {
  const todayStr = new Date().toDateString()
  const lastTradeStr = regularMarketTime != null ? new Date(regularMarketTime).toDateString() : null

  if (state === 'CLOSED') {
    return lastTradeStr === todayStr
      ? { label: '장마감', color: '#64748b' }
      : { label: '휴장', color: '#64748b' }
  }
  // Yahoo Finance가 휴장/주말에도 REGULAR를 반환하는 경우: 마지막 거래일이 오늘이 아니면 휴장
  if (state === 'REGULAR' && lastTradeStr != null && lastTradeStr !== todayStr) {
    return { label: '휴장', color: '#64748b' }
  }
  const map: Record<string, { label: string; color: string }> = {
    REGULAR:  { label: '본장',    color: '#22c55e' },
    PRE:      { label: '프리장',  color: '#f59e0b' },
    PREPRE:   { label: '데이장',  color: '#64748b' },
    POST:     { label: '애프터장', color: '#818cf8' },
    POSTPOST: { label: '데이장',  color: '#64748b' },
  }
  return map[state] ?? { label: state, color: '#64748b' }
}

export default function StockCard({ quote }: Props) {
  const [showBuy, setShowBuy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [viewCurrency, setViewCurrency] = useState<'USD' | 'KRW'>(() => quote.currency === 'KRW' ? 'KRW' : 'USD')
  const { refreshQuote } = useStock()
  const { theme } = useTheme()
  const { toggle, isFavorite } = useFavorites()
  const { currentUSDKRW } = usePortfolio()
  const { isMobile } = useWindowSize()
  const marketState = marketStateLabel(quote.marketState, quote.regularMarketTime)
  const isMarketOverviewSymbol = MARKET_OVERVIEW_SYMBOLS.has(quote.symbol)
  const favorited = isFavorite(quote.symbol)
  const isKRW = viewCurrency === 'KRW'
  const isNativeKRW = quote.currency === 'KRW'
  const rate = currentUSDKRW

  // 종목이 바뀌면 표시 통화 리셋
  useEffect(() => {
    setViewCurrency(quote.currency === 'KRW' ? 'KRW' : 'USD')
  }, [quote.symbol, quote.currency])

  function px(value: number | undefined) {
    if (value == null) return '-'
    if (isNativeKRW) {
      // value가 이미 KRW
      return isKRW
        ? `₩ ${Math.round(value).toLocaleString('ko-KR')}`
        : `$ ${(value / rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    // value가 USD
    return isKRW
      ? `₩ ${Math.round(value * rate).toLocaleString('ko-KR')}`
      : `${quote.currency} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  function formatChangePx(change: number | undefined, pct: number | undefined) {
    if (change == null || pct == null) return '-'
    const sign = change >= 0 ? '+' : ''
    if (isNativeKRW) {
      // change가 이미 KRW
      return isKRW
        ? `${sign}₩${Math.round(Math.abs(change)).toLocaleString('ko-KR')} (${sign}${pct.toFixed(2)}%)`
        : `${sign}$ ${(Math.abs(change) / rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${sign}${pct.toFixed(2)}%)`
    }
    // change가 USD
    return isKRW
      ? formatChangeKRW(change, pct, rate)
      : formatChange(change, pct)
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
          <h2 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 700, color: theme.text.primary, marginBottom: '4px' }}>{quote.name}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: theme.text.muted }}>{quote.symbol}</span>
            <span style={{ fontSize: '13px', color: theme.text.muted }}>·</span>
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
                  {formatChangePx(change, pct)}
                </span>
              )
            })()}
          </div>
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
            {!isMarketOverviewSymbol && (
              <button
                onClick={() => setShowBuy(true)}
                style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: theme.up, color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
              >
                매수
              </button>
            )}
            {!isMarketOverviewSymbol && (
              <button
                onClick={() => toggle(quote.symbol)}
                title={favorited ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                style={{ padding: '6px 10px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'transparent', cursor: 'pointer', fontSize: '18px', color: favorited ? '#f59e0b' : theme.text.muted, lineHeight: 1 }}
              >
                {favorited ? '★' : '☆'}
              </button>
            )}
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
          {(isNativeKRW !== isKRW) && (
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
          { label: '시가총액', value: isKRW
            ? `₩${formatNumberKRW(isNativeKRW ? quote.marketCap : quote.marketCap * rate)}`
            : (isNativeKRW ? `$ ${formatNumber(Math.round(quote.marketCap / rate))}` : formatNumber(quote.marketCap)) },
          { label: 'P/E', value: quote.trailingPE?.toFixed(2) ?? '-' },
          { label: '배당수익률', value: quote.dividendYield != null ? `${(quote.dividendYield * 100).toFixed(2)}%` : '-' },
          { label: '52주 범위', value: isKRW
            ? `${px(quote.fiftyTwoWeekLow)} ~ ${px(quote.fiftyTwoWeekHigh)}`
            : `${quote.fiftyTwoWeekLow?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '-'} ~ ${quote.fiftyTwoWeekHigh?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '-'}` },
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
        stockCurrency={quote.currency}
        onClose={() => setShowBuy(false)}
      />
    )}
    </>
  )
}
