import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useWindowSize } from '../../hooks/useWindowSize'
import { usePortfolio } from '../../context/PortfolioContext'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'

type Mode = 'dca' | 'buyhold'
type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly'
type Currency = 'USD' | 'KRW'

interface RawPoint { time: number; close: number }
interface ChartPoint { date: string; portfolioValue: number; totalInvested: number }
interface SearchResult { symbol: string; name: string }

const FREQ_LABELS: { value: Frequency; label: string }[] = [
  { value: 'daily', label: '매일' },
  { value: 'weekly', label: '매주' },
  { value: 'monthly', label: '매달' },
  { value: 'yearly', label: '매년' },
]

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function getNextInvestDate(current: Date, freq: Frequency): Date {
  const d = new Date(current)
  if (freq === 'daily') d.setDate(d.getDate() + 1)
  else if (freq === 'weekly') d.setDate(d.getDate() + 7)
  else if (freq === 'monthly') d.setMonth(d.getMonth() + 1)
  else if (freq === 'yearly') d.setFullYear(d.getFullYear() + 1)
  return d
}

function findNearestPrice(points: RawPoint[], targetMs: number): number | null {
  let best: RawPoint | null = null
  for (const p of points) {
    if (p.time >= targetMs) {
      if (!best || p.time < best.time) best = p
    }
  }
  if (!best && points.length > 0) best = points[points.length - 1]
  return best?.close ?? null
}

// 항상 USD 기준으로 계산
function computeDCA(
  points: RawPoint[],
  startDate: string,
  endDate: string,
  freq: Frequency,
  amountUSD: number,
): ChartPoint[] {
  if (points.length === 0) return []

  const startMs = new Date(startDate).getTime()
  const endMs = new Date(endDate).getTime()
  const sorted = [...points].sort((a, b) => a.time - b.time)

  const investDates: number[] = []
  let cur = new Date(startDate)
  while (cur.getTime() <= endMs) {
    investDates.push(cur.getTime())
    cur = getNextInvestDate(cur, freq)
  }

  let totalShares = 0
  let totalInvested = 0
  let investIdx = 0
  const result: ChartPoint[] = []

  for (const p of sorted) {
    if (p.time < startMs || p.time > endMs) continue
    while (investIdx < investDates.length && investDates[investIdx] <= p.time) {
      if (p.close > 0) {
        totalShares += amountUSD / p.close
        totalInvested += amountUSD
      }
      investIdx++
    }
    result.push({
      date: toDateStr(new Date(p.time)),
      portfolioValue: parseFloat((totalShares * p.close).toFixed(2)),
      totalInvested: parseFloat(totalInvested.toFixed(2)),
    })
  }

  return result
}

function computeBuyHold(
  points: RawPoint[],
  buyDate: string,
  endDate: string,
  amountUSD: number,
): ChartPoint[] {
  if (points.length === 0) return []

  const buyMs = new Date(buyDate).getTime()
  const endMs = new Date(endDate).getTime()

  const buyPrice = findNearestPrice(points, buyMs)
  if (!buyPrice || buyPrice <= 0) return []

  const shares = amountUSD / buyPrice
  const result: ChartPoint[] = []

  for (const p of points) {
    if (p.time < buyMs || p.time > endMs) continue
    result.push({
      date: toDateStr(new Date(p.time)),
      portfolioValue: parseFloat((shares * p.close).toFixed(2)),
      totalInvested: amountUSD,
    })
  }

  return result
}

function fmtMoney(n: number, currency: Currency, rate: number) {
  if (currency === 'KRW') {
    return '₩' + Math.round(n * rate).toLocaleString('ko-KR')
  }
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

function fmtPct(n: number) {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export default function InvestmentPage() {
  const { theme } = useTheme()
  const { isMobile } = useWindowSize()
  const { currentUSDKRW } = usePortfolio()

  const [mode, setMode] = useState<Mode>('dca')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [symbolConfirmed, setSymbolConfirmed] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const justSelectedRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // DCA params
  const [dcaStart, setDcaStart] = useState(() => toDateStr(addDays(new Date(), -365)))
  const [dcaEnd, setDcaEnd] = useState(() => toDateStr(new Date()))
  const [dcaFreq, setDcaFreq] = useState<Frequency>('monthly')
  const [dcaAmount, setDcaAmount] = useState('100')

  // Buy & Hold params
  const [bhBuyDate, setBhBuyDate] = useState(() => toDateStr(addDays(new Date(), -365)))
  const [bhEndDate, setBhEndDate] = useState(() => toDateStr(new Date()))
  const [bhAmount, setBhAmount] = useState('10000')

  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 검색 debounce
  useEffect(() => {
    if (justSelectedRef.current) { justSelectedRef.current = false; return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!searchQuery.trim()) { setSearchResults([]); setShowDropdown(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(searchQuery)}`)
        const data: SearchResult[] = await res.json()
        setSearchResults(data)
        setShowDropdown(data.length > 0)
      } catch { setSearchResults([]) }
    }, 400)
  }, [searchQuery])

  function selectSymbol(sym: string) {
    justSelectedRef.current = true
    setSymbolConfirmed(sym)
    setSearchQuery(sym)
    setShowDropdown(false)
    setChartData([])
  }

  // KRW 입력값 → USD 변환
  function toUSD(raw: string): number {
    const n = parseFloat(raw.replace(/,/g, ''))
    if (!n || n <= 0) return 0
    return currency === 'KRW' ? n / currentUSDKRW : n
  }

  async function runSimulation() {
    const sym = symbolConfirmed.trim().toUpperCase()
    if (!sym) { setError('종목을 선택해주세요.'); return }

    const from = mode === 'dca' ? dcaStart : bhBuyDate
    const to = mode === 'dca' ? dcaEnd : bhEndDate

    if (from >= to) { setError('시작일이 종료일보다 이전이어야 합니다.'); return }

    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/stocks/chart/${sym}?interval=1d&from=${from}&to=${to}`)
      if (!res.ok) throw new Error('데이터를 불러오지 못했습니다.')
      const raw: RawPoint[] = await res.json()
      if (!raw || raw.length === 0) { setError('해당 기간의 데이터가 없습니다.'); return }

      if (mode === 'dca') {
        const amountUSD = toUSD(dcaAmount)
        if (amountUSD <= 0) { setError('투자 금액을 입력해주세요.'); return }
        setChartData(computeDCA(raw, from, to, dcaFreq, amountUSD))
      } else {
        const amountUSD = toUSD(bhAmount)
        if (amountUSD <= 0) { setError('투자 금액을 입력해주세요.'); return }
        setChartData(computeBuyHold(raw, from, to, amountUSD))
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const last = chartData[chartData.length - 1]
  const first = chartData[0]
  const totalInvested = last?.totalInvested ?? 0
  const finalValue = last?.portfolioValue ?? 0
  const profit = finalValue - totalInvested
  const profitPct = totalInvested > 0 ? (profit / totalInvested) * 100 : 0
  const isProfit = profit >= 0

  const rate = currentUSDKRW
  const fmt = (n: number) => fmtMoney(n, currency, rate)

  // 차트 Y축 포맷
  const yAxisFmt = (v: number) =>
    currency === 'KRW'
      ? '₩' + Math.round(v * rate).toLocaleString('ko-KR')
      : '$' + v.toLocaleString()

  const cardStyle = {
    background: theme.bg.card,
    border: `1px solid ${theme.border}`,
    borderRadius: '12px',
    padding: isMobile ? '16px' : '20px',
  }

  const labelStyle = {
    fontSize: '12px',
    color: theme.text.muted,
    marginBottom: '4px',
    display: 'block' as const,
  }

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: `1px solid ${theme.border}`,
    background: theme.bg.input,
    color: theme.text.primary,
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  const amountLabel = currency === 'KRW' ? '(KRW)' : '(USD)'

  return (
    <div style={{ padding: isMobile ? '12px' : '20px', maxWidth: '960px', margin: '0 auto' }}>
      <h2 style={{ color: theme.text.primary, marginBottom: '20px', fontSize: isMobile ? '18px' : '22px' }}>
        투자 방식 시뮬레이터
      </h2>

      <div style={{ ...cardStyle, marginBottom: '16px' }}>
        {/* 모드 + 통화 토글 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {([
              { v: 'dca' as Mode, l: '적립식 (DCA)' },
              { v: 'buyhold' as Mode, l: '거치식 (Buy & Hold)' },
            ]).map(({ v, l }) => (
              <button
                key={v}
                onClick={() => { setMode(v); setChartData([]) }}
                style={{
                  padding: '8px 20px', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                  border: `2px solid ${mode === v ? theme.accent : theme.border}`,
                  background: mode === v ? theme.accent : 'transparent',
                  color: mode === v ? '#fff' : theme.text.secondary,
                }}
              >{l}</button>
            ))}
          </div>
          {/* 통화 토글 */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['USD', 'KRW'] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                style={{
                  padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${currency === c ? theme.accent : theme.border}`,
                  background: currency === c ? theme.accent + '22' : 'transparent',
                  color: currency === c ? theme.accent : theme.text.muted,
                }}
              >{c}</button>
            ))}
          </div>
        </div>

        {/* 종목 검색 */}
        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>종목 검색</label>
          <div ref={containerRef} style={{ position: 'relative', maxWidth: isMobile ? '100%' : '340px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSymbolConfirmed('') }}
              placeholder="티커 또는 종목명 입력 (예: AAPL)"
              style={inputStyle}
            />
            {showDropdown && (
              <ul style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: theme.bg.card, border: `1px solid ${theme.border}`,
                borderRadius: '8px', marginTop: '4px', listStyle: 'none',
                padding: 0, zIndex: 200, maxHeight: '200px', overflowY: 'auto',
              }}>
                {searchResults.map((r) => (
                  <li
                    key={r.symbol}
                    onMouseDown={(e) => { e.preventDefault(); selectSymbol(r.symbol) }}
                    style={{
                      padding: '10px 14px', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between',
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
        </div>

        {/* DCA params */}
        {mode === 'dca' && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '12px' }}>
            <div>
              <label style={labelStyle}>시작일</label>
              <input type="date" value={dcaStart} onChange={(e) => setDcaStart(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>종료일</label>
              <input type="date" value={dcaEnd} onChange={(e) => setDcaEnd(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>투자 주기</label>
              <select value={dcaFreq} onChange={(e) => setDcaFreq(e.target.value as Frequency)} style={inputStyle}>
                {FREQ_LABELS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>1회 투자금액 {amountLabel}</label>
              <input
                type="text" inputMode="decimal"
                value={dcaAmount}
                onChange={(e) => setDcaAmount(e.target.value)}
                placeholder={currency === 'KRW' ? '150,000' : '100'}
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {/* Buy & Hold params */}
        {mode === 'buyhold' && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '12px' }}>
            <div>
              <label style={labelStyle}>매수일</label>
              <input type="date" value={bhBuyDate} onChange={(e) => setBhBuyDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>종료일</label>
              <input type="date" value={bhEndDate} onChange={(e) => setBhEndDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>투자금액 {amountLabel}</label>
              <input
                type="text" inputMode="decimal"
                value={bhAmount}
                onChange={(e) => setBhAmount(e.target.value)}
                placeholder={currency === 'KRW' ? '13,000,000' : '10000'}
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: '12px', color: theme.down, fontSize: '13px' }}>{error}</div>
        )}

        <div style={{ marginTop: '16px' }}>
          <button
            onClick={runSimulation}
            disabled={loading}
            style={{
              padding: '10px 24px', borderRadius: '8px', border: 'none',
              background: theme.accent, color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
            }}
          >
            {loading ? '계산 중...' : '시뮬레이션 실행'}
          </button>
        </div>
      </div>

      {/* Results */}
      {chartData.length > 0 && (
        <>
          {/* Summary stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: '12px', marginBottom: '16px',
          }}>
            {[
              { label: '총 투자금액', value: fmt(totalInvested), color: theme.text.primary },
              { label: '최종 평가금액', value: fmt(finalValue), color: theme.text.primary },
              { label: '수익금', value: `${isProfit ? '+' : ''}${fmt(profit)}`, color: isProfit ? theme.up : theme.down },
              { label: '수익률', value: fmtPct(profitPct), color: isProfit ? theme.up : theme.down },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ ...cardStyle, textAlign: 'center' as const }}>
                <div style={{ fontSize: '12px', color: theme.text.muted, marginBottom: '6px' }}>{label}</div>
                <div style={{ fontSize: isMobile ? '15px' : '17px', fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{ ...cardStyle, marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: theme.text.primary, marginBottom: '16px' }}>
              {symbolConfirmed} · {mode === 'dca' ? '적립식 투자' : '거치식 투자'} 포트폴리오 가치
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gradValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.accent} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={theme.accent} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradInvested" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.text.muted} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={theme.text.muted} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                <XAxis dataKey="date" tick={{ fill: theme.text.muted, fontSize: 11 }} tickLine={false} interval="preserveStartEnd" />
                <YAxis
                  tick={{ fill: theme.text.muted, fontSize: 11 }}
                  tickLine={false} axisLine={false}
                  tickFormatter={yAxisFmt}
                  width={currency === 'KRW' ? 90 : 70}
                />
                <Tooltip
                  contentStyle={{
                    background: theme.bg.card, border: `1px solid ${theme.border}`,
                    borderRadius: '8px', color: theme.text.primary, fontSize: '13px',
                  }}
                  formatter={(value: number, name: string) => [
                    fmt(value),
                    name === 'portfolioValue' ? '평가금액' : '투자금액',
                  ]}
                  labelStyle={{ color: theme.text.muted, marginBottom: '4px' }}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: theme.text.secondary, fontSize: '12px' }}>
                      {value === 'portfolioValue' ? '평가금액' : '투자금액'}
                    </span>
                  )}
                />
                <Area type="monotone" dataKey="totalInvested" stroke={theme.text.muted} strokeWidth={1.5} strokeDasharray="4 2" fill="url(#gradInvested)" dot={false} />
                <Area type="monotone" dataKey="portfolioValue" stroke={theme.accent} strokeWidth={2} fill="url(#gradValue)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Summary */}
          <div style={{ ...cardStyle }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: theme.text.primary, marginBottom: '12px' }}>시뮬레이션 요약</div>
            <div style={{
              display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '8px', fontSize: '13px', color: theme.text.secondary,
            }}>
              <div>종목: <strong style={{ color: theme.text.primary }}>{symbolConfirmed}</strong></div>
              <div>투자 방식: <strong style={{ color: theme.text.primary }}>{mode === 'dca' ? '적립식 (DCA)' : '거치식 (Buy & Hold)'}</strong></div>
              <div>시작일: <strong style={{ color: theme.text.primary }}>{first?.date ?? '-'}</strong></div>
              <div>종료일: <strong style={{ color: theme.text.primary }}>{last?.date ?? '-'}</strong></div>
              {mode === 'dca' && (
                <>
                  <div>투자 주기: <strong style={{ color: theme.text.primary }}>{FREQ_LABELS.find(f => f.value === dcaFreq)?.label}</strong></div>
                  <div>1회 투자금액: <strong style={{ color: theme.text.primary }}>{fmt(toUSD(dcaAmount))}</strong></div>
                </>
              )}
              <div>총 투자 원금: <strong style={{ color: theme.text.primary }}>{fmt(totalInvested)}</strong></div>
              <div>최종 평가금액: <strong style={{ color: theme.text.primary }}>{fmt(finalValue)}</strong></div>
              <div>수익률: <strong style={{ color: isProfit ? theme.up : theme.down }}>{fmtPct(profitPct)}</strong></div>
              {currency === 'KRW' && (
                <div style={{ fontSize: '11px', color: theme.text.muted }}>
                  적용 환율 {rate.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}원/달러
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {chartData.length === 0 && !loading && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 20px', color: theme.text.muted }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📈</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: theme.text.secondary, marginBottom: '8px' }}>
            {mode === 'dca' ? '적립식 투자 시뮬레이션' : '거치식 투자 시뮬레이션'}
          </div>
          <div style={{ fontSize: '14px' }}>종목을 선택하고 조건을 설정한 후 시뮬레이션을 실행해보세요.</div>
        </div>
      )}
    </div>
  )
}
