import { useState, useEffect, useRef, useCallback } from 'react'
import { useStock } from '../../context/StockContext'
import { useNavigation } from '../../context/NavigationContext'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

type CompareInterval = '1m' | '5m' | '1d' | '1mo'

const INTERVALS: { label: string; value: CompareInterval }[] = [
  { label: '1분', value: '1m' },
  { label: '5분', value: '5m' },
  { label: '1일', value: '1d' },
  { label: '한달', value: '1mo' },
]

const COLORS = [
  '#60a5fa', '#34d399', '#f87171', '#fbbf24', '#a78bfa',
  '#fb923c', '#38bdf8', '#4ade80', '#f472b6', '#facc15',
]

// 인터벌별 기본 시작일 오프셋 (일 단위)
const DEFAULT_DAYS: Record<CompareInterval, number> = {
  '1m': 1, '5m': 5, '1d': 365, '1mo': 1825,
}

interface SymbolEntry { symbol: string; name: string }
interface RawPoint { time: number; close: number }

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function getDefaultRange(interval: CompareInterval) {
  const to = toDateStr(new Date())
  const from = toDateStr(new Date(Date.now() - DEFAULT_DAYS[interval] * 86400_000))
  return { from, to }
}

function formatTime(ts: number, interval: CompareInterval) {
  const d = new Date(ts)
  if (interval === '1m' || interval === '5m')
    return d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  if (interval === '1d')
    return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric' })
}

function buildMergedData(
  symbols: string[],
  dataMap: Record<string, RawPoint[]>,
): Record<string, number | undefined>[] {
  if (symbols.length === 0) return []

  const bases: Record<string, number> = {}
  for (const sym of symbols) {
    const data = dataMap[sym]
    if (data && data.length > 0) bases[sym] = data[0].close
  }

  const allTimes = new Set<number>()
  for (const sym of symbols) dataMap[sym]?.forEach((p) => allTimes.add(p.time))

  const lookups: Record<string, Map<number, number>> = {}
  for (const sym of symbols)
    lookups[sym] = new Map(dataMap[sym]?.map((p) => [p.time, p.close]) ?? [])

  return Array.from(allTimes)
    .sort((a, b) => a - b)
    .map((time) => {
      const point: Record<string, number | undefined> = { time }
      for (const sym of symbols) {
        const close = lookups[sym]?.get(time)
        const base = bases[sym]
        point[sym] = (close != null && base != null && base !== 0)
          ? parseFloat(((close / base - 1) * 100).toFixed(3))
          : undefined
      }
      return point
    })
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '6px',
  color: '#f1f5f9',
  fontSize: '13px',
  outline: 'none',
  colorScheme: 'dark',
}

export default function ComparisonPage() {
  const { setSelectedQuote } = useStock()
  const { setPage } = useNavigation()
  const [symbols, setSymbols] = useState<SymbolEntry[]>([])
  const [interval, setIntervalVal] = useState<CompareInterval>('1d')
  const [dateRange, setDateRange] = useState(getDefaultRange('1d'))
  const [pendingRange, setPendingRange] = useState(getDefaultRange('1d'))
  const [dataMap, setDataMap] = useState<Record<string, RawPoint[]>>({})
  const [loadingSet, setLoadingSet] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SymbolEntry[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const justSelectedRef = useRef(false)

  // 검색
  useEffect(() => {
    if (justSelectedRef.current) { justSelectedRef.current = false; return }
    if (!query.trim()) { setSearchResults([]); setShowDropdown(false); return }
    const timer = setTimeout(() => {
      fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d: SymbolEntry[]) => { setSearchResults(d); setShowDropdown(true) })
        .catch(() => {})
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // 차트 데이터 조회
  const fetchChart = useCallback((
    symbol: string,
    intv: CompareInterval,
    from: string,
    to: string,
  ) => {
    setLoadingSet((prev) => new Set(prev).add(symbol))
    fetch(`/api/stocks/chart/${symbol}?interval=${intv}&from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((data: RawPoint[]) => setDataMap((prev) => ({ ...prev, [symbol]: data })))
      .catch(() => {})
      .finally(() => setLoadingSet((prev) => { const s = new Set(prev); s.delete(symbol); return s }))
  }, [])

  // 인터벌 변경 → 날짜 범위 리셋 + 전체 재조회
  function handleIntervalChange(intv: CompareInterval) {
    const range = getDefaultRange(intv)
    setIntervalVal(intv)
    setDateRange(range)
    setPendingRange(range)
    setDataMap({})
    symbols.forEach(({ symbol }) => fetchChart(symbol, intv, range.from, range.to))
  }

  // 날짜 범위 적용
  function applyDateRange() {
    if (pendingRange.from > pendingRange.to) return
    setDateRange(pendingRange)
    setDataMap({})
    symbols.forEach(({ symbol }) => fetchChart(symbol, interval, pendingRange.from, pendingRange.to))
  }

  function addSymbol(entry: SymbolEntry) {
    if (symbols.length >= 10) return
    if (symbols.some((s) => s.symbol === entry.symbol)) return
    setSymbols((prev) => [...prev, entry])
    fetchChart(entry.symbol, interval, dateRange.from, dateRange.to)
    justSelectedRef.current = true
    setQuery('')
    setShowDropdown(false)
    setSearchResults([])
  }

  async function navigateToSymbol(symbol: string) {
    const res = await fetch(`/api/stocks/quote/${symbol}`)
    if (res.ok) {
      const data = await res.json()
      setSelectedQuote(data)
      setPage('home')
    }
  }

  function removeSymbol(symbol: string) {
    setSymbols((prev) => prev.filter((s) => s.symbol !== symbol))
    setDataMap((prev) => { const d = { ...prev }; delete d[symbol]; return d })
  }

  const mergedData = buildMergedData(symbols.map((s) => s.symbol), dataMap)
  const isLoading = loadingSet.size > 0
  const rangeInvalid = pendingRange.from > pendingRange.to

  return (
    <div>
      {/* 검색 */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder={symbols.length >= 10 ? '최대 10종목까지 추가 가능합니다' : '종목 검색 후 추가 (최대 10개)'}
            disabled={symbols.length >= 10}
            style={{
              width: '100%', padding: '10px 14px',
              background: '#1e293b', border: '1px solid #334155',
              borderRadius: '8px', color: '#f1f5f9', fontSize: '14px',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          {showDropdown && searchResults.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: '#1e293b', border: '1px solid #334155',
              borderRadius: '8px', zIndex: 50, maxHeight: '220px',
              overflowY: 'auto', marginTop: '4px',
            }}>
              {searchResults.map((r) => {
                const added = symbols.some((s) => s.symbol === r.symbol)
                return (
                  <div
                    key={r.symbol}
                    onMouseDown={() => addSymbol(r)}
                    style={{
                      padding: '10px 14px', cursor: added ? 'default' : 'pointer',
                      display: 'flex', gap: '10px', alignItems: 'center',
                      borderBottom: '1px solid #0f172a', opacity: added ? 0.5 : 1,
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#f1f5f9', minWidth: '60px' }}>{r.symbol}</span>
                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>{r.name}</span>
                    {added && <span style={{ marginLeft: 'auto', color: '#22c55e', fontSize: '12px' }}>추가됨</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 종목 칩 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {symbols.map((s, i) => (
            <div key={s.symbol} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 10px', borderRadius: '999px',
              background: '#1e293b', border: `1px solid ${COLORS[i % COLORS.length]}`,
              fontSize: '13px',
            }}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: COLORS[i % COLORS.length], flexShrink: 0,
              }} />
              <span
                onClick={() => navigateToSymbol(s.symbol)}
                style={{ color: '#f1f5f9', fontWeight: 600, cursor: 'pointer' }}
                title="종목 정보 보기"
              >{s.symbol}</span>
              <span style={{ color: '#64748b', fontSize: '11px' }}>{s.name}</span>
              <button
                onClick={() => removeSymbol(s.symbol)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#64748b', fontSize: '16px', padding: 0, lineHeight: 1,
                }}
              >×</button>
            </div>
          ))}
        </div>
      </div>

      {/* 차트 */}
      <div style={{
        background: '#1e293b', borderRadius: '12px',
        padding: '20px 24px', border: '1px solid #334155',
      }}>
        {/* 컨트롤 행 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          {/* 인터벌 */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {INTERVALS.map((item) => (
              <button
                key={item.value}
                onClick={() => handleIntervalChange(item.value)}
                style={{
                  padding: '4px 12px', borderRadius: '6px', border: 'none',
                  cursor: 'pointer', fontSize: '13px',
                  background: interval === item.value ? '#3b82f6' : '#0f172a',
                  color: interval === item.value ? '#fff' : '#94a3b8',
                  fontWeight: interval === item.value ? 600 : 400,
                }}
              >{item.label}</button>
            ))}
          </div>

          {/* 날짜 범위 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="date"
              value={pendingRange.from}
              max={pendingRange.to}
              onChange={(e) => setPendingRange((p) => ({ ...p, from: e.target.value }))}
              style={inputStyle}
            />
            <span style={{ color: '#475569', fontSize: '13px' }}>~</span>
            <input
              type="date"
              value={pendingRange.to}
              min={pendingRange.from}
              max={toDateStr(new Date())}
              onChange={(e) => setPendingRange((p) => ({ ...p, to: e.target.value }))}
              style={inputStyle}
            />
            <button
              onClick={applyDateRange}
              disabled={rangeInvalid || symbols.length === 0}
              style={{
                padding: '6px 14px', borderRadius: '6px', border: 'none',
                cursor: rangeInvalid || symbols.length === 0 ? 'default' : 'pointer',
                fontSize: '13px', fontWeight: 600,
                background: rangeInvalid || symbols.length === 0 ? '#1e3a5f' : '#3b82f6',
                color: rangeInvalid || symbols.length === 0 ? '#475569' : '#fff',
              }}
            >조회</button>
          </div>
        </div>

        {symbols.length === 0 ? (
          <div style={{
            height: '320px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#475569', fontSize: '14px',
          }}>
            종목을 추가해 차트를 비교하세요
          </div>
        ) : isLoading ? (
          <div style={{
            height: '320px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#475569',
          }}>
            불러오는 중...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={mergedData}>
              <XAxis
                dataKey="time"
                tickFormatter={(t) => formatTime(Number(t), interval)}
                tick={{ fill: '#475569', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#475569', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
                width={68}
              />
              <Tooltip
                contentStyle={{
                  background: '#0f172a', border: '1px solid #334155',
                  borderRadius: '8px', fontSize: '12px',
                }}
                labelFormatter={(t) => formatTime(Number(t), interval)}
                formatter={(v: number, name: string) => [
                  `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`, name,
                ]}
              />
              <Legend
                formatter={(value) => (
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>{value}</span>
                )}
              />
              {symbols.map((s, i) => (
                <Line
                  key={s.symbol}
                  type="monotone"
                  dataKey={s.symbol}
                  stroke={COLORS[i % COLORS.length]}
                  dot={false}
                  strokeWidth={1.5}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
