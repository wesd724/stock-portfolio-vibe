import { useState } from 'react'

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}
import { createPortal } from 'react-dom'
import { usePortfolio } from '../../context/PortfolioContext'
import { useTheme } from '../../context/ThemeContext'
import { useWindowSize } from '../../hooks/useWindowSize'
import { Transaction } from '../../types/portfolio'

interface Props {
  symbol: string
  name: string
  maxShares: number
  minDate: string
  stockCurrency?: string  // 종목 원래 통화 ('USD' | 'KRW')
  onClose: () => void
}

const today = new Date().toISOString().split('T')[0]

function formatKRW(amount: number): string {
  return '₩' + Math.round(amount).toLocaleString('ko-KR')
}

function formatUSD(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtInput(value: string, integerOnly: boolean): string {
  const clean = integerOnly
    ? value.replace(/[^0-9]/g, '')
    : value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
  const parts = clean.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.length > 1 ? parts.join('.') : parts[0]
}

function parseInput(value: string): number {
  return parseFloat(value.replace(/,/g, '')) || 0
}

export default function SellModal({ symbol, name, maxShares, minDate, stockCurrency = 'USD', onClose }: Props) {
  const isNativeKRW = stockCurrency === 'KRW'
  const [date, setDate] = useState(today)
  const [sharesRaw, setSharesRaw] = useState('')
  const [amountRaw, setAmountRaw] = useState('')
  const [priceInfo, setPriceInfo] = useState<{ price: number; actualDate: string; exchangeRate: number; isCurrentPrice?: boolean } | null>(null)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { addTransaction } = usePortfolio()
  const { theme, isDark } = useTheme()
  const { isMobile } = useWindowSize()

  function calcAmountFromShares(sharesNum: number, info: typeof priceInfo): string {
    if (!info || sharesNum <= 0) return ''
    // 금액은 KRW로 표시
    const amountKRW = isNativeKRW
      ? sharesNum * info.price                          // shares * KRW price = KRW
      : sharesNum * info.price * info.exchangeRate      // shares * USD price * rate = KRW
    return fmtInput(Math.round(amountKRW).toString(), true)
  }

  function calcSharesFromAmount(amountNum: number, info: typeof priceInfo): string {
    if (!info || amountNum <= 0) return ''
    // amountNum은 KRW
    const shares = isNativeKRW
      ? amountNum / info.price                          // KRW / KRW price
      : amountNum / (info.price * info.exchangeRate)    // KRW / (USD price * rate)
    return fmtInput(shares.toFixed(6).replace(/\.?0+$/, ''), false)
  }

  function handleSharesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = fmtInput(e.target.value, false)
    setSharesRaw(formatted)
    setAmountRaw(calcAmountFromShares(parseInput(formatted), priceInfo))
  }

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = fmtInput(e.target.value, true)
    setAmountRaw(formatted)
    setSharesRaw(calcSharesFromAmount(parseInput(formatted), priceInfo))
  }

  async function fetchPrice() {
    if (!date) return
    if (date < minDate) {
      setError(`매도 날짜는 최초 매수일(${minDate}) 이후여야 합니다.`)
      return
    }
    setLoadingPrice(true)
    setError(null)
    setPriceInfo(null)
    try {
      const [priceRes, forexRes] = await Promise.all([
        fetch(`/api/stocks/price-at/${symbol}?date=${date}`),
        fetch(`/api/stocks/forex/rate?date=${date}`),
      ])
      if (!priceRes.ok) throw new Error('해당 날짜 주가를 찾을 수 없습니다.')
      const priceData = await priceRes.json()
      let exchangeRate = 1300
      if (forexRes.ok) {
        const forexData = await forexRes.json()
        exchangeRate = forexData.rate ?? 1300
      }
      const info = { price: priceData.price, actualDate: priceData.date, exchangeRate, isCurrentPrice: priceData.isCurrentPrice ?? false }
      setPriceInfo(info)
      // 기존 입력값으로 반대쪽 재계산
      const sNum = parseInput(sharesRaw)
      const aNum = parseInput(amountRaw)
      if (sNum > 0) {
        setAmountRaw(calcAmountFromShares(sNum, info))
      } else if (aNum > 0) {
        setSharesRaw(calcSharesFromAmount(aNum, info))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setLoadingPrice(false)
    }
  }

  function handleFullSell() {
    const floored = Math.floor(maxShares * 10000) / 10000
    const formatted = fmtInput(floored.toFixed(4), false)
    setSharesRaw(formatted)
    setAmountRaw(calcAmountFromShares(floored, priceInfo))
  }

  async function handleSell() {
    if (!priceInfo) return
    const sharesNum = parseInput(sharesRaw)
    if (sharesNum <= 0 || sharesNum > maxShares + 1e-9) return

    setSubmitting(true)
    // priceAtDate와 amount는 항상 USD로 저장
    const priceAtDateUSD = isNativeKRW ? priceInfo.price / priceInfo.exchangeRate : priceInfo.price
    const tx: Transaction = {
      id: generateId(),
      type: 'SELL',
      symbol,
      name,
      date: priceInfo.actualDate,
      priceAtDate: priceAtDateUSD,
      shares: sharesNum,
      amount: priceAtDateUSD * sharesNum,
      exchangeRate: priceInfo.exchangeRate,
      currency: 'KRW',
      stockCurrency,
      createdAt: Date.now(),
    }
    try {
      await addTransaction(tx)
      onClose()
    } catch {
      setError('처리 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const sharesNum = parseInput(sharesRaw)
  const amountNum = parseInput(amountRaw)
  const isValid = priceInfo && sharesNum > 0 && sharesNum <= maxShares + 1e-9 && date >= minDate

  const inputStyle = {
    flex: 1, padding: '8px 12px', borderRadius: '8px',
    border: `1px solid ${theme.border}`, background: theme.bg.input,
    color: theme.text.primary, fontSize: '14px',
  }

  return createPortal(
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: theme.overlay, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
    >
      <div style={{ background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '460px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '4px', color: theme.text.primary }}>매도</h2>
        <p style={{ fontSize: '13px', color: theme.text.muted, marginBottom: '20px' }}>{symbol} · {name} · 보유 {maxShares.toFixed(4)}주</p>

        {/* 날짜 */}
        <label style={{ fontSize: '13px', color: theme.text.secondary }}>매도 날짜</label>
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', marginBottom: '16px' }}>
          <input
            type="date" value={date} max={today} min={minDate}
            onChange={(e) => {
              const val = e.target.value
              setDate(val)
              setPriceInfo(null)
              setSharesRaw('')
              setAmountRaw('')
              if (val) {
                const day = new Date(val + 'T00:00:00').getDay()
                setError(day === 0 || day === 6 ? '주말은 거래일이 아닙니다.' : null)
              }
            }}
            style={{ ...inputStyle, flex: 1, colorScheme: isDark ? 'dark' : 'light' }}
          />
          <button
            onClick={fetchPrice} disabled={loadingPrice || !date || [0, 6].includes(new Date(date + 'T00:00:00').getDay())}
            style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: theme.border, color: theme.text.primary, cursor: 'pointer', fontSize: '13px' }}
          >
            {loadingPrice ? '조회 중...' : '가격 조회'}
          </button>
        </div>

        {/* 가격 정보 */}
        {priceInfo && (
          <div style={{ background: theme.bg.input, borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px' }}>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ color: theme.text.muted }}>{priceInfo.actualDate} {priceInfo.isCurrentPrice ? '현재가' : '종가'}  </span>
              {isNativeKRW ? (
                <>
                  <span style={{ color: theme.text.primary, fontWeight: 600 }}>{formatKRW(priceInfo.price)}</span>
                  <span style={{ color: theme.text.muted }}>  ≈  </span>
                  <span style={{ color: theme.text.primary, fontWeight: 600 }}>{formatUSD(priceInfo.price / priceInfo.exchangeRate)}</span>
                </>
              ) : (
                <>
                  <span style={{ color: theme.text.primary, fontWeight: 600 }}>{formatUSD(priceInfo.price)}</span>
                  <span style={{ color: theme.text.muted }}>  ≈  </span>
                  <span style={{ color: theme.text.primary, fontWeight: 600 }}>{formatKRW(priceInfo.price * priceInfo.exchangeRate)}</span>
                </>
              )}
            </div>
            <div>
              <span style={{ color: theme.text.muted }}>환율  </span>
              <span style={{ color: theme.text.primary }}>{priceInfo.exchangeRate.toLocaleString('ko-KR', { maximumFractionDigits: 1 })} 원/달러</span>
            </div>
          </div>
        )}

        {error && <p style={{ color: theme.down, fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

        {/* 주수 / 금액 입력 */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '13px', color: theme.text.secondary }}>주 수</label>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <input
                type="text" inputMode="decimal"
                value={sharesRaw}
                onChange={handleSharesChange}
                placeholder="0.0000"
                style={{ ...inputStyle, flex: 1, minWidth: 0 }}
              />
              <button
                onClick={handleFullSell}
                style={{ padding: '8px 10px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'transparent', color: theme.text.secondary, cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}
              >
                전량
              </button>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '13px', color: theme.text.secondary }}>금액 (KRW)</label>
            <input
              type="text" inputMode="decimal"
              value={amountRaw}
              onChange={handleAmountChange}
              placeholder="0"
              style={{ ...inputStyle, width: '100%', marginTop: '6px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* 환산 미리보기 */}
        {priceInfo && sharesNum > 0 && amountNum > 0 && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: theme.text.muted }}>
            ≈ <span style={{ color: theme.text.secondary }}>
              {isNativeKRW
                ? formatUSD(sharesNum * priceInfo.price / priceInfo.exchangeRate)
                : formatUSD(sharesNum * priceInfo.price)}
            </span>
            <span style={{ color: theme.text.muted }}> (USD 기준)</span>
          </div>
        )}

        {sharesNum > maxShares + 1e-9 && (
          <p style={{ color: theme.down, fontSize: '12px', marginTop: '6px' }}>보유 수량을 초과했습니다.</p>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'transparent', color: theme.text.secondary, cursor: 'pointer', fontSize: '14px' }}>
            취소
          </button>
          <button
            onClick={handleSell} disabled={!isValid || submitting}
            style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: theme.down, color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: !isValid ? 0.4 : 1 }}
          >
            {submitting ? '처리 중...' : '매도'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
