import { useState, useEffect, useRef } from 'react'
import { StockQuote, StockSearchResult } from '../types/stock'
import StockCard from './StockCard'

export default function StockSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StockSearchResult[]>([])
  const [quote, setQuote] = useState<StockQuote | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
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
    setShowDropdown(false)
    setQuery(symbol)
    setLoading(true)
    setError(null)
    setQuote(null)

    try {
      const res = await fetch(`/api/stocks/quote/${symbol}`)
      if (!res.ok) throw new Error('종목 정보를 가져올 수 없습니다.')
      const data: StockQuote = await res.json()
      setQuote(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '560px' }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="종목명 또는 티커 입력 (예: AAPL, Tesla)"
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: '10px',
          border: '1px solid #334155',
          background: '#1e293b',
          color: '#f1f5f9',
          fontSize: '15px',
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
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '10px',
          marginTop: '4px',
          listStyle: 'none',
          zIndex: 10,
          overflow: 'hidden',
        }}>
          {results.map((r) => (
            <li
              key={r.symbol}
              onClick={() => selectStock(r.symbol)}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '1px solid #334155',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#0f172a')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontWeight: 600 }}>{r.symbol}</span>
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>{r.name}</span>
            </li>
          ))}
        </ul>
      )}

      {loading && <p style={{ marginTop: '16px', color: '#94a3b8' }}>불러오는 중...</p>}
      {error && <p style={{ marginTop: '16px', color: '#ef4444' }}>{error}</p>}
      {quote && <StockCard quote={quote} />}
    </div>
  )
}
