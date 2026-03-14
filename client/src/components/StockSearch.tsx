import { useState, useEffect, useRef } from 'react'
import { StockQuote, StockSearchResult } from '../types/stock'
import { useStock } from '../context/StockContext'
import { useNavigation } from '../context/NavigationContext'
import { useTheme } from '../context/ThemeContext'

export default function StockSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StockSearchResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const justSelectedRef = useRef(false)
  const { setSelectedQuote } = useStock()
  const { setPage } = useNavigation()
  const { theme } = useTheme()

  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults([])
      setShowDropdown(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`)
        const data: StockSearchResult[] = await res.json()
        setResults(data)
        setShowDropdown(data.length > 0)
      } catch {
        setResults([])
      }
    }, 400)
  }, [query])

  async function selectStock(symbol: string) {
    justSelectedRef.current = true
    setShowDropdown(false)
    setQuery(symbol)

    try {
      const res = await fetch(`/api/stocks/quote/${symbol}`)
      if (!res.ok) return
      const data: StockQuote = await res.json()
      setSelectedQuote(data)
      setPage('home')
    } catch {
      // 에러 무시
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="종목명 또는 티커 검색"
        style={{
          width: '100%',
          padding: '8px 14px',
          borderRadius: '8px',
          border: `1px solid ${theme.border}`,
          background: theme.bg.card,
          color: theme.text.primary,
          fontSize: '14px',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      {showDropdown && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: theme.bg.card,
          border: `1px solid ${theme.border}`,
          borderRadius: '8px',
          marginTop: '4px',
          listStyle: 'none',
          zIndex: 200,
          overflow: 'hidden',
        }}>
          {results.map((r) => (
            <li
              key={r.symbol}
              onClick={() => selectStock(r.symbol)}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: `1px solid ${theme.bg.input}`,
                color: theme.text.primary,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = theme.bg.hover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontWeight: 600, fontSize: '14px' }}>{r.symbol}</span>
              <span style={{ color: theme.text.secondary, fontSize: '13px' }}>{r.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
