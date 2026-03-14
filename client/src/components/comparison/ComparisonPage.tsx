import { useState, useEffect, useRef, useCallback } from 'react'
import { useStock } from '../../context/StockContext'
import { useNavigation } from '../../context/NavigationContext'
import { useTheme } from '../../context/ThemeContext'
import { StockQuote } from '../../types/stock'
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

const DEFAULT_DAYS: Record<CompareInterval, number> = {
  '1m': 1, '5m': 5, '1d': 365, '1mo': 1825,
}

interface SymbolEntry { symbol: string; name: string }
interface RawPoint { time: number; close: number }

function toDateStr(d: Date) { return d.toISOString().split('T')[0] }

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

function formatNumber(n: number | undefined) {
  if (n == null) return '-'
  if (n >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(2)}T`
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  return n.toLocaleString()
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
  return Array.from(allTimes).sort((a, b) => a - b).map((time) => {
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

// ① 기간 수익률
function calcPeriodReturn(data: RawPoint[]): number | null {
  if (!data || data.length < 2) return null
  const first = data[0].close
  const last = data[data.length - 1].close
  return (last - first) / first * 100
}

// ③ 변동성 (수익률 표준편차)
function calcVolatility(data: RawPoint[]): number | null {
  if (!data || data.length < 3) return null
  const returns: number[] = []
  for (let i = 1; i < data.length; i++) {
    if (data[i - 1].close !== 0)
      returns.push((data[i].close - data[i - 1].close) / data[i - 1].close * 100)
  }
  if (returns.length < 2) return null
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length
  return Math.sqrt(variance)
}

// ④ 상관계수 (Pearson)
function calcCorrelation(a: RawPoint[], b: RawPoint[]): number | null {
  const mapB = new Map(b.map((p) => [p.time, p.close]))
  const pairs: [number, number][] = []
  for (const p of a) {
    const bv = mapB.get(p.time)
    if (bv != null) pairs.push([p.close, bv])
  }
  if (pairs.length < 5) return null
  const meanA = pairs.reduce((s, [x]) => s + x, 0) / pairs.length
  const meanB = pairs.reduce((s, [, y]) => s + y, 0) / pairs.length
  let cov = 0, varA = 0, varB = 0
  for (const [x, y] of pairs) {
    cov += (x - meanA) * (y - meanB)
    varA += (x - meanA) ** 2
    varB += (y - meanB) ** 2
  }
  if (varA === 0 || varB === 0) return null
  return cov / Math.sqrt(varA * varB)
}

function corrColor(r: number): string {
  if (r >= 0.7) return '#22c55e'
  if (r >= 0.3) return '#86efac'
  if (r >= -0.3) return '#94a3b8'
  if (r >= -0.7) return '#93c5fd'
  return '#3b82f6'
}

export default function ComparisonPage() {
  const { setSelectedQuote } = useStock()
  const { setPage } = useNavigation()
  const { theme } = useTheme()
  const [symbols, setSymbols] = useState<SymbolEntry[]>([])
  const [interval, setIntervalVal] = useState<CompareInterval>('1d')
  const [dateRange, setDateRange] = useState(getDefaultRange('1d'))
  const [pendingRange, setPendingRange] = useState(getDefaultRange('1d'))
  const [dataMap, setDataMap] = useState<Record<string, RawPoint[]>>({})
  const [quotesMap, setQuotesMap] = useState<Record<string, StockQuote>>({})
  const [loadingSet, setLoadingSet] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SymbolEntry[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const justSelectedRef = useRef(false)

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', background: theme.bg.input, border: `1px solid ${theme.border}`,
    borderRadius: '6px', color: theme.text.primary, fontSize: '13px', outline: 'none', colorScheme: 'dark',
  }

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

  // 종목 추가 시 quote 조회
  useEffect(() => {
    const missing = symbols.filter((s) => !quotesMap[s.symbol])
    missing.forEach(({ symbol }) => {
      fetch(`/api/stocks/quote/${symbol}`)
        .then((r) => r.json())
        .then((q: StockQuote) => setQuotesMap((prev) => ({ ...prev, [symbol]: q })))
        .catch(() => {})
    })
  }, [symbols.map((s) => s.symbol).join(',')])

  const fetchChart = useCallback((symbol: string, intv: CompareInterval, from: string, to: string) => {
    setLoadingSet((prev) => new Set(prev).add(symbol))
    fetch(`/api/stocks/chart/${symbol}?interval=${intv}&from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((data: RawPoint[]) => setDataMap((prev) => ({ ...prev, [symbol]: data })))
      .catch(() => {})
      .finally(() => setLoadingSet((prev) => { const s = new Set(prev); s.delete(symbol); return s }))
  }, [])

  function handleIntervalChange(intv: CompareInterval) {
    const range = getDefaultRange(intv)
    setIntervalVal(intv)
    setDateRange(range)
    setPendingRange(range)
    setDataMap({})
    symbols.forEach(({ symbol }) => fetchChart(symbol, intv, range.from, range.to))
  }

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
    if (res.ok) { setSelectedQuote(await res.json()); setPage('home') }
  }

  function removeSymbol(symbol: string) {
    setSymbols((prev) => prev.filter((s) => s.symbol !== symbol))
    setDataMap((prev) => { const d = { ...prev }; delete d[symbol]; return d })
    setQuotesMap((prev) => { const d = { ...prev }; delete d[symbol]; return d })
  }

  const mergedData = buildMergedData(symbols.map((s) => s.symbol), dataMap)
  const isLoading = loadingSet.size > 0
  const rangeInvalid = pendingRange.from > pendingRange.to
  const hasData = symbols.length > 0 && !isLoading && Object.keys(dataMap).length > 0

  const sectionCard = {
    background: theme.bg.card, borderRadius: '12px',
    padding: '20px 24px', border: `1px solid ${theme.border}`, marginTop: '16px',
  }

  const sectionTitle = {
    fontSize: '14px', fontWeight: 600, color: theme.text.primary, marginBottom: '16px',
  }

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
              background: theme.bg.card, border: `1px solid ${theme.border}`,
              borderRadius: '8px', color: theme.text.primary, fontSize: '14px',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          {showDropdown && searchResults.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: theme.bg.card, border: `1px solid ${theme.border}`,
              borderRadius: '8px', zIndex: 50, maxHeight: '220px', overflowY: 'auto', marginTop: '4px',
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
                      borderBottom: `1px solid ${theme.bg.input}`, opacity: added ? 0.5 : 1,
                    }}
                  >
                    <span style={{ fontWeight: 700, color: theme.text.primary, minWidth: '60px' }}>{r.symbol}</span>
                    <span style={{ color: theme.text.secondary, fontSize: '13px' }}>{r.name}</span>
                    {added && <span style={{ marginLeft: 'auto', color: theme.up, fontSize: '12px' }}>추가됨</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {symbols.map((s, i) => (
            <div key={s.symbol} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 10px', borderRadius: '999px',
              background: theme.bg.card, border: `1px solid ${COLORS[i % COLORS.length]}`, fontSize: '13px',
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
              <span onClick={() => navigateToSymbol(s.symbol)} style={{ color: theme.text.primary, fontWeight: 600, cursor: 'pointer' }}>{s.symbol}</span>
              <span style={{ color: theme.text.muted, fontSize: '11px' }}>{s.name}</span>
              <button onClick={() => removeSymbol(s.symbol)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text.muted, fontSize: '16px', padding: 0, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      </div>

      {/* 차트 */}
      <div style={{ background: theme.bg.card, borderRadius: '12px', padding: '20px 24px', border: `1px solid ${theme.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {INTERVALS.map((item) => (
              <button key={item.value} onClick={() => handleIntervalChange(item.value)} style={{
                padding: '4px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px',
                background: interval === item.value ? theme.accent : theme.bg.input,
                color: interval === item.value ? '#fff' : theme.text.secondary,
                fontWeight: interval === item.value ? 600 : 400,
              }}>{item.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="date" value={pendingRange.from} max={pendingRange.to} onChange={(e) => setPendingRange((p) => ({ ...p, from: e.target.value }))} style={inputStyle} />
            <span style={{ color: theme.text.muted, fontSize: '13px' }}>~</span>
            <input type="date" value={pendingRange.to} min={pendingRange.from} max={toDateStr(new Date())} onChange={(e) => setPendingRange((p) => ({ ...p, to: e.target.value }))} style={inputStyle} />
            <button onClick={applyDateRange} disabled={rangeInvalid || symbols.length === 0} style={{
              padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: rangeInvalid || symbols.length === 0 ? 'default' : 'pointer', fontSize: '13px', fontWeight: 600,
              background: rangeInvalid || symbols.length === 0 ? theme.bg.hover : theme.accent,
              color: rangeInvalid || symbols.length === 0 ? theme.text.muted : '#fff',
            }}>조회</button>
          </div>
        </div>

        {symbols.length === 0 ? (
          <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.text.muted, fontSize: '14px' }}>
            종목을 추가해 차트를 비교하세요
          </div>
        ) : isLoading ? (
          <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.text.muted }}>불러오는 중...</div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={mergedData}>
              <XAxis dataKey="time" tickFormatter={(t) => formatTime(Number(t), interval)} tick={{ fill: theme.text.muted, fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: theme.text.muted, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`} width={68} />
              <Tooltip
                contentStyle={{ background: theme.bg.input, border: `1px solid ${theme.border}`, borderRadius: '8px', fontSize: '12px' }}
                labelFormatter={(t) => formatTime(Number(t), interval)}
                formatter={(v, name) => { const n = v as number; return [`${n >= 0 ? '+' : ''}${n.toFixed(2)}%`, name as string] }}
              />
              <Legend formatter={(value) => <span style={{ color: theme.text.secondary, fontSize: '12px' }}>{value}</span>} />
              {symbols.map((s, i) => (
                <Line key={s.symbol} type="monotone" dataKey={s.symbol} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={1.5} connectNulls={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── 하단 분석 섹션 ── */}
      {hasData && (
        <>
          {/* ① 기간 성과 요약 */}
          <div style={sectionCard}>
            <div style={sectionTitle}>기간 성과 요약</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(() => {
                const returns = symbols.map((s, i) => ({
                  ...s, i,
                  ret: calcPeriodReturn(dataMap[s.symbol]),
                  first: dataMap[s.symbol]?.[0]?.close,
                  last: dataMap[s.symbol]?.[dataMap[s.symbol].length - 1]?.close,
                }))
                const maxAbs = Math.max(...returns.map((r) => Math.abs(r.ret ?? 0)), 1)
                return returns.map(({ symbol, i, ret, first, last }) => (
                  <div key={symbol}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                      <span style={{ fontWeight: 600, color: COLORS[i % COLORS.length] }}>{symbol}</span>
                      <span style={{ display: 'flex', gap: '16px', color: theme.text.muted }}>
                        <span>{first != null ? `$${first.toFixed(2)}` : '-'} → {last != null ? `$${last.toFixed(2)}` : '-'}</span>
                        <span style={{ fontWeight: 700, color: ret == null ? theme.text.muted : ret >= 0 ? theme.up : theme.down, minWidth: '80px', textAlign: 'right' }}>
                          {ret == null ? '-' : `${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%`}
                        </span>
                      </span>
                    </div>
                    <div style={{ height: '6px', background: theme.bg.input, borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '3px',
                        width: `${Math.abs(ret ?? 0) / maxAbs * 100}%`,
                        background: ret == null ? theme.border : ret >= 0 ? theme.up : theme.down,
                        marginLeft: ret != null && ret < 0 ? 'auto' : undefined,
                      }} />
                    </div>
                  </div>
                ))
              })()}
            </div>
          </div>

          {/* ② 지표 비교 테이블 */}
          <div style={sectionCard}>
            <div style={sectionTitle}>지표 비교</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <td style={{ padding: '6px 12px', color: theme.text.muted, fontWeight: 600, borderBottom: `1px solid ${theme.border}` }}>지표</td>
                    {symbols.map((s, i) => (
                      <td key={s.symbol} style={{ padding: '6px 12px', textAlign: 'right', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: COLORS[i % COLORS.length] }}>{s.symbol}</td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      label: '현재가', fn: (q: StockQuote) =>
                        q.price != null ? `$${q.price.toFixed(2)}` : '-'
                    },
                    {
                      label: '등락률', fn: (q: StockQuote) => {
                        const v = q.changePercent
                        if (v == null) return '-'
                        return <span style={{ color: v >= 0 ? theme.up : theme.down }}>{v >= 0 ? '+' : ''}{v.toFixed(2)}%</span>
                      }
                    },
                    { label: '시가총액', fn: (q: StockQuote) => formatNumber(q.marketCap) },
                    { label: 'P/E', fn: (q: StockQuote) => q.trailingPE?.toFixed(2) ?? '-' },
                    {
                      label: '배당수익률', fn: (q: StockQuote) =>
                        q.dividendYield != null ? `${(q.dividendYield * 100).toFixed(2)}%` : '-'
                    },
                    {
                      label: '52주 최고', fn: (q: StockQuote) =>
                        q.fiftyTwoWeekHigh != null ? `$${q.fiftyTwoWeekHigh.toFixed(2)}` : '-'
                    },
                    {
                      label: '52주 최저', fn: (q: StockQuote) =>
                        q.fiftyTwoWeekLow != null ? `$${q.fiftyTwoWeekLow.toFixed(2)}` : '-'
                    },
                  ].map(({ label, fn }) => (
                    <tr key={label} style={{ borderBottom: `1px solid ${theme.border}` }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = theme.bg.hover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '8px 12px', color: theme.text.muted }}>{label}</td>
                      {symbols.map((s) => (
                        <td key={s.symbol} style={{ padding: '8px 12px', textAlign: 'right', color: theme.text.primary, fontWeight: 500 }}>
                          {quotesMap[s.symbol] ? fn(quotesMap[s.symbol]) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ③ 변동성 비교 */}
          <div style={sectionCard}>
            <div style={sectionTitle}>변동성 비교 <span style={{ fontSize: '12px', fontWeight: 400, color: theme.text.muted }}>(수익률 표준편차, 낮을수록 안정적)</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(() => {
                const vols = symbols.map((s, i) => ({ ...s, i, vol: calcVolatility(dataMap[s.symbol]) }))
                const maxVol = Math.max(...vols.map((v) => v.vol ?? 0), 0.001)
                return vols.map(({ symbol, i, vol }) => (
                  <div key={symbol}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                      <span style={{ fontWeight: 600, color: COLORS[i % COLORS.length] }}>{symbol}</span>
                      <span style={{ color: theme.text.secondary, fontWeight: 600 }}>
                        {vol != null ? `±${vol.toFixed(3)}%` : '-'}
                      </span>
                    </div>
                    <div style={{ height: '6px', background: theme.bg.input, borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '3px',
                        width: `${(vol ?? 0) / maxVol * 100}%`,
                        background: COLORS[i % COLORS.length],
                      }} />
                    </div>
                  </div>
                ))
              })()}
            </div>
          </div>

          {/* ④ 상관관계 매트릭스 */}
          {symbols.length >= 2 && (
            <div style={sectionCard}>
              <div style={sectionTitle}>상관관계 매트릭스 <span style={{ fontSize: '12px', fontWeight: 400, color: theme.text.muted }}>(1에 가까울수록 같이 움직임)</span></div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <td style={{ padding: '6px 12px', borderBottom: `1px solid ${theme.border}` }} />
                      {symbols.map((s, i) => (
                        <td key={s.symbol} style={{ padding: '6px 16px', textAlign: 'center', fontWeight: 700, color: COLORS[i % COLORS.length], borderBottom: `1px solid ${theme.border}` }}>{s.symbol}</td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {symbols.map((rowS, ri) => (
                      <tr key={rowS.symbol}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: COLORS[ri % COLORS.length], borderRight: `1px solid ${theme.border}` }}>{rowS.symbol}</td>
                        {symbols.map((colS, ci) => {
                          const corr = ri === ci ? 1 : calcCorrelation(dataMap[rowS.symbol] ?? [], dataMap[colS.symbol] ?? [])
                          const bg = corr != null ? corrColor(corr) + '44' : theme.bg.input
                          const textColor = corr != null ? corrColor(corr) : theme.text.muted
                          return (
                            <td key={colS.symbol} style={{
                              padding: '8px 16px', textAlign: 'center',
                              background: bg, fontWeight: ri === ci ? 700 : 500,
                              color: textColor, borderRadius: '4px',
                            }}>
                              {corr != null ? corr.toFixed(2) : '-'}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '11px', color: theme.text.muted }}>
                  <span style={{ color: '#22c55e' }}>■</span> 강한 양의 상관 (≥0.7)
                  <span style={{ color: '#86efac' }}>■</span> 약한 양의 상관
                  <span style={{ color: '#94a3b8' }}>■</span> 무상관
                  <span style={{ color: '#93c5fd' }}>■</span> 약한 음의 상관
                  <span style={{ color: '#3b82f6' }}>■</span> 강한 음의 상관 (≤−0.7)
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
