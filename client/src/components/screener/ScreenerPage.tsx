import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useStock } from '../../context/StockContext'
import { useNavigation } from '../../context/NavigationContext'

type QuoteType = 'ALL' | 'EQUITY' | 'ETF'
type SortField = 'changePercent' | 'volume' | 'avgVolume3M'
type Order = 'desc' | 'asc'

interface ScreenerItem {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  avgVolume3M: number
  quoteType: string
}

function formatVolume(v: number): string {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + 'B'
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K'
  return v.toString()
}

const QUOTE_TYPES: { label: string; value: QuoteType }[] = [
  { label: '전체', value: 'ALL' },
  { label: '주식', value: 'EQUITY' },
  { label: 'ETF', value: 'ETF' },
]

const SORT_FIELDS: { label: string; value: SortField }[] = [
  { label: '1일 수익률', value: 'changePercent' },
  { label: '1일 거래량', value: 'volume' },
  { label: '3개월 거래량', value: 'avgVolume3M' },
]

export default function ScreenerPage() {
  const { theme } = useTheme()
  const { setSelectedQuote } = useStock()
  const { setPage } = useNavigation()

  const [quoteType, setQuoteType] = useState<QuoteType>('ALL')
  const [sortField, setSortField] = useState<SortField>('volume')
  const [order, setOrder] = useState<Order>('desc')
  const [items, setItems] = useState<ScreenerItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchScreener(qt: QuoteType, sf: SortField, ord: Order) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/stocks/screener?type=${qt}&sort=${sf}&order=${ord}`)
      if (!res.ok) throw new Error('데이터를 불러오지 못했습니다.')
      setItems(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchScreener(quoteType, sortField, order) }, [])

  function handleFilter(qt: QuoteType, sf: SortField, ord: Order) {
    setQuoteType(qt)
    setSortField(sf)
    setOrder(ord)
    fetchScreener(qt, sf, ord)
  }

  async function handleRowClick(symbol: string) {
    const res = await fetch(`/api/stocks/quote/${symbol}`)
    if (res.ok) {
      setSelectedQuote(await res.json())
      setPage('home')
    }
  }

  const btnBase = {
    padding: '5px 14px', borderRadius: '6px', border: `1px solid ${theme.border}`,
    cursor: 'pointer', fontSize: '13px', fontWeight: 500,
  }

  const activeBtn = {
    ...btnBase,
    background: theme.accent,
    border: `1px solid ${theme.accent}`,
    color: '#fff',
    fontWeight: 600,
  }

  const inactiveBtn = {
    ...btnBase,
    background: 'transparent',
    color: theme.text.secondary,
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: theme.text.primary }}>종목 목록</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {!loading && !error && (
            <span style={{ fontSize: '12px', color: theme.text.muted }}>
              총 {items.length}개 · 본장 기준 · 15분 지연
            </span>
          )}
          <button
            onClick={() => fetchScreener(quoteType, sortField, order)}
            disabled={loading}
            title="새로고침"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text.muted, fontSize: '16px', padding: '2px' }}
          >
            {loading ? '⟳' : '↻'}
          </button>
        </div>
      </div>

      {/* 필터 바 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
        {/* 종류 */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {QUOTE_TYPES.map(({ label, value }) => (
            <button key={value} onClick={() => handleFilter(value, sortField, order)}
              style={quoteType === value ? activeBtn : inactiveBtn}
            >{label}</button>
          ))}
        </div>

        <span style={{ color: theme.border }}>|</span>

        {/* 정렬 기준 */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {SORT_FIELDS.map(({ label, value }) => (
            <button key={value} onClick={() => handleFilter(quoteType, value, order)}
              style={sortField === value ? activeBtn : inactiveBtn}
            >{label}</button>
          ))}
        </div>

        <span style={{ color: theme.border }}>|</span>

        {/* 오름/내림차순 */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {([['내림차순', 'desc'], ['오름차순', 'asc']] as const).map(([label, value]) => (
            <button key={value} onClick={() => handleFilter(quoteType, sortField, value)}
              style={order === value ? activeBtn : inactiveBtn}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* 테이블 */}
      <div style={{ background: theme.bg.card, borderRadius: '12px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
        {/* 헤더 */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 60px',
          padding: '10px 16px', borderBottom: `1px solid ${theme.border}`,
          fontSize: '12px', color: theme.text.muted, fontWeight: 600,
        }}>
          <span>종목</span>
          <span style={{ textAlign: 'right' }}>현재가</span>
          <span style={{ textAlign: 'right' }}>등락</span>
          <span style={{ textAlign: 'right' }}>1일 수익률</span>
          <span style={{ textAlign: 'right' }}>1일 거래량</span>
          <span style={{ textAlign: 'right' }}>3개월</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: theme.text.muted, fontSize: '14px' }}>
            불러오는 중...
          </div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: theme.down, fontSize: '14px' }}>
            {error}
          </div>
        ) : (
          items.map((item, i) => {
            const isPos = item.changePercent >= 0
            const color = isPos ? theme.up : theme.down
            return (
              <div
                key={item.symbol}
                onClick={() => handleRowClick(item.symbol)}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 60px',
                  padding: '10px 16px',
                  borderBottom: i < items.length - 1 ? `1px solid ${theme.border}` : 'none',
                  cursor: 'pointer', fontSize: '13px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = theme.bg.hover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <span style={{ fontWeight: 700, color: theme.text.primary }}>{item.symbol}</span>
                  <span style={{ marginLeft: '8px', fontSize: '12px', color: theme.text.muted }}>{item.name}</span>
                </div>
                <span style={{ textAlign: 'right', color: theme.text.primary }}>${item.price.toFixed(2)}</span>
                <span style={{ textAlign: 'right', color }}>
                  {isPos ? '+' : ''}{item.change.toFixed(2)}
                </span>
                <span style={{ textAlign: 'right', color, fontWeight: 600 }}>
                  {isPos ? '+' : ''}{item.changePercent.toFixed(2)}%
                </span>
                <span style={{ textAlign: 'right', color: theme.text.secondary }}>
                  {formatVolume(item.volume)}
                </span>
                <span style={{ textAlign: 'right', color: theme.text.muted }}>
                  {item.avgVolume3M ? formatVolume(item.avgVolume3M) : '-'}
                </span>
              </div>
            )
          })
        )}
      </div>

    </div>
  )
}
