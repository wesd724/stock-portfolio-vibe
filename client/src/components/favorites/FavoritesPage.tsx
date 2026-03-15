import { useEffect, useState } from 'react'
import { useFavorites } from '../../context/FavoritesContext'
import { useStock } from '../../context/StockContext'
import { useNavigation } from '../../context/NavigationContext'
import { useTheme } from '../../context/ThemeContext'
import { StockQuote } from '../../types/stock'

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

const GRID_COLS = '80px 1fr 120px 160px 100px 40px'
const GRID_MIN_WIDTH = '540px'

export default function FavoritesPage() {
  const { symbols, toggle } = useFavorites()
  const { setSelectedQuote } = useStock()
  const { setPage } = useNavigation()
  const { theme } = useTheme()
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (symbols.length === 0) return
    setLoading(true)
    Promise.all(
      symbols.map((sym) =>
        fetch(`/api/stocks/quote/${sym}`)
          .then((r) => r.json())
          .then((data: StockQuote) => [sym, data] as const)
          .catch(() => null)
      )
    ).then((results) => {
      const map: Record<string, StockQuote> = {}
      results.forEach((entry) => {
        if (entry) map[entry[0]] = entry[1]
      })
      setQuotes(map)
      setLoading(false)
    })
  }, [symbols.join(',')])

  function handleRowClick(quote: StockQuote) {
    setSelectedQuote(quote)
    setPage('home')
  }

  return (
    <div style={{
      background: theme.bg.card,
      borderRadius: '12px',
      border: `1px solid ${theme.border}`,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '16px', fontWeight: 600, color: theme.text.primary }}>
          즐겨찾기
        </span>
        <span style={{ fontSize: '12px', color: theme.text.muted }}>
          총 {symbols.length}개
        </span>
      </div>

      {symbols.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', color: theme.text.muted, fontSize: '14px' }}>
          즐겨찾기한 종목이 없습니다.<br />
          종목 정보 화면의 ☆ 버튼으로 추가하세요.
        </div>
      ) : loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: theme.text.muted, fontSize: '14px' }}>
          불러오는 중...
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          {/* 헤더 행 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: GRID_COLS,
            minWidth: GRID_MIN_WIDTH,
            padding: '8px 20px',
            fontSize: '11px',
            color: theme.text.muted,
            borderBottom: `1px solid ${theme.border}`,
          }}>
            <span>티커</span>
            <span>종목명</span>
            <span style={{ textAlign: 'right' }}>현재가</span>
            <span style={{ textAlign: 'right' }}>본장 등락</span>
            <span style={{ textAlign: 'center' }}>상태</span>
            <span />
          </div>

          {symbols.map((sym) => {
            const q = quotes[sym]
            if (!q) return (
              <div key={sym} style={{
                display: 'grid',
                gridTemplateColumns: GRID_COLS,
                minWidth: GRID_MIN_WIDTH,
                padding: '14px 20px',
                fontSize: '13px',
                color: theme.text.muted,
                borderBottom: `1px solid ${theme.border}`,
              }}>
                <span>{sym}</span>
                <span>로드 실패</span>
                <span /><span /><span />
                <button
                  onClick={(e) => { e.stopPropagation(); toggle(sym) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#f59e0b', padding: 0 }}
                >★</button>
              </div>
            )
            const isPositive = q.change >= 0
            const changeColor = isPositive ? theme.up : theme.down
            const sign = isPositive ? '+' : ''
            const ms = marketStateLabel(q.marketState)

            return (
              <div
                key={sym}
                onClick={() => handleRowClick(q)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: GRID_COLS,
                  minWidth: GRID_MIN_WIDTH,
                  padding: '14px 20px',
                  fontSize: '13px',
                  borderBottom: `1px solid ${theme.border}`,
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = theme.bg.hover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontWeight: 600, color: theme.text.primary }}>{q.symbol}</span>
                <span style={{ color: theme.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.name}</span>
                <span style={{ textAlign: 'right', color: theme.text.primary, fontWeight: 500 }}>
                  {q.currency} {q.price?.toFixed(2)}
                </span>
                <span style={{ textAlign: 'right', color: changeColor }}>
                  {sign}{q.change?.toFixed(2)} ({sign}{q.changePercent?.toFixed(2)}%)
                </span>
                <span style={{ textAlign: 'center' }}>
                  <span style={{
                    fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
                    background: theme.bg.input, color: ms.color,
                  }}>
                    {ms.label}
                  </span>
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); toggle(sym) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#f59e0b', padding: 0, justifySelf: 'center' }}
                  title="즐겨찾기 해제"
                >★</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
