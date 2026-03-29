import { useState } from 'react'
import { createPortal } from 'react-dom'
import { usePortfolio } from '../../context/PortfolioContext'
import { useTheme } from '../../context/ThemeContext'
import { useWindowSize } from '../../hooks/useWindowSize'
import { Transaction } from '../../types/portfolio'

interface Props {
  symbol: string
  name: string
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

// 입력값 포맷 (쉼표 추가)
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

export default function BuyModal({ symbol, name, stockCurrency = 'USD', onClose }: Props) {
  const isNativeKRW = stockCurrency === 'KRW'
  const [date, setDate] = useState(today)
  const [currency, setCurrency] = useState<'KRW' | 'USD'>(isNativeKRW ? 'KRW' : 'USD')
  const [amountRaw, setAmountRaw] = useState('')
  const [sharesRaw, setSharesRaw] = useState('')
  const [priceInfo, setPriceInfo] = useState<{ price: number; actualDate: string; exchangeRate: number; isCurrentPrice?: boolean } | null>(null)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { addTransaction, accountBalance, currentUSDKRW } = usePortfolio()
  const { theme, isDark } = useTheme()
  const { isMobile } = useWindowSize()

  const isKRW = currency === 'KRW'

  function calcSharesFromAmount(amountNum: number, info: typeof priceInfo): string {
    if (!info || amountNum <= 0) return ''
    let shares: number
    if (isNativeKRW) {
      // info.price가 KRW
      shares = isKRW
        ? amountNum / info.price                          // KRW / KRW
        : (amountNum * info.exchangeRate) / info.price   // USD * rate / KRW
    } else {
      // info.price가 USD
      shares = isKRW
        ? (amountNum / info.exchangeRate) / info.price   // KRW / rate / USD
        : amountNum / info.price                          // USD / USD
    }
    return fmtInput(shares.toFixed(6).replace(/\.?0+$/, ''), false)
  }

  function calcAmountFromShares(sharesNum: number, info: typeof priceInfo): string {
    if (!info || sharesNum <= 0) return ''
    let amount: number
    if (isNativeKRW) {
      // info.price가 KRW
      amount = isKRW
        ? sharesNum * info.price                          // shares * KRW = KRW
        : sharesNum * info.price / info.exchangeRate      // shares * KRW / rate = USD
    } else {
      // info.price가 USD
      amount = isKRW
        ? sharesNum * info.price * info.exchangeRate      // shares * USD * rate = KRW
        : sharesNum * info.price                          // shares * USD = USD
    }
    return fmtInput(isKRW ? Math.round(amount).toString() : amount.toFixed(2), isKRW)
  }

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = fmtInput(e.target.value, isKRW)
    setAmountRaw(formatted)
    const num = parseInput(formatted)
    setSharesRaw(calcSharesFromAmount(num, priceInfo))
  }

  function handleSharesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = fmtInput(e.target.value, false)
    setSharesRaw(formatted)
    const num = parseInput(formatted)
    setAmountRaw(calcAmountFromShares(num, priceInfo))
  }

  async function fetchPrice() {
    if (!date) return
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
      const aNum = parseInput(amountRaw)
      const sNum = parseInput(sharesRaw)
      if (aNum > 0) {
        setSharesRaw(calcSharesFromAmount(aNum, info))
      } else if (sNum > 0) {
        setAmountRaw(calcAmountFromShares(sNum, info))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setLoadingPrice(false)
    }
  }

  function handleCurrencyChange(c: 'KRW' | 'USD') {
    setCurrency(c)
    setAmountRaw('')
    setSharesRaw('')
    setPriceInfo(null)
  }

  async function handleBuy() {
    if (!priceInfo) return
    const sharesNum = parseInput(sharesRaw)
    const amountNum = parseInput(amountRaw)
    if (sharesNum <= 0 || amountNum <= 0) return

    setSubmitting(true)
    const amountUSD = isKRW ? amountNum / priceInfo.exchangeRate : amountNum
    // priceAtDate는 항상 USD로 저장
    const priceAtDateUSD = isNativeKRW ? priceInfo.price / priceInfo.exchangeRate : priceInfo.price
    const tx: Transaction = {
      id: crypto.randomUUID(),
      type: 'BUY',
      symbol,
      name,
      date: priceInfo.actualDate,
      priceAtDate: priceAtDateUSD,
      shares: sharesNum,
      amount: amountUSD,
      exchangeRate: priceInfo.exchangeRate,
      currency,
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
  const amountUSD = priceInfo ? (isKRW ? amountNum / priceInfo.exchangeRate : amountNum) : 0
  const insufficientBalance = amountUSD > accountBalance
  const isValid = priceInfo && sharesNum > 0 && amountNum > 0 && !insufficientBalance

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: theme.text.primary }}>매수</h2>
          <div style={{ textAlign: 'right' }}>
            {isKRW ? (
              <>
                <div style={{ fontSize: '12px', color: theme.text.muted }}>
                  잔액 <span style={{ color: theme.text.primary, fontWeight: 600 }}>
                    {formatKRW(accountBalance * (priceInfo?.exchangeRate ?? currentUSDKRW))}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: theme.text.muted }}>
                  {priceInfo
                    ? `(${priceInfo.actualDate} 환율 ${priceInfo.exchangeRate.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}원)`
                    : `(현재 환율 ${currentUSDKRW.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}원)`}
                </div>
              </>
            ) : (
              <div style={{ fontSize: '12px', color: theme.text.muted }}>
                잔액 <span style={{ color: theme.text.primary, fontWeight: 600 }}>{formatUSD(accountBalance)}</span>
              </div>
            )}
          </div>
        </div>
        <p style={{ fontSize: '13px', color: theme.text.muted, marginBottom: '20px' }}>{symbol} · {name}</p>

        {/* 날짜 */}
        <label style={{ fontSize: '13px', color: theme.text.secondary }}>투자 날짜</label>
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', marginBottom: '16px' }}>
          <input
            type="date" value={date} max={today} min="1980-01-01"
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
        {insufficientBalance && amountNum > 0 && priceInfo && (
          <p style={{ color: theme.down, fontSize: '13px', marginBottom: '12px' }}>
            잔액 부족 — 필요{' '}
            {isKRW ? formatKRW(amountUSD * priceInfo.exchangeRate) : formatUSD(amountUSD)}
            {' '}/ 보유{' '}
            {isKRW ? formatKRW(accountBalance * priceInfo.exchangeRate) : formatUSD(accountBalance)}
          </p>
        )}

        {/* 통화 토글 */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          {(['KRW', 'USD'] as const).map((c) => (
            <button key={c} onClick={() => handleCurrencyChange(c)}
              style={{
                padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${currency === c ? theme.up : theme.border}`,
                background: currency === c ? theme.upBg : 'transparent',
                color: currency === c ? theme.up : theme.text.secondary,
              }}
            >{c}</button>
          ))}
        </div>

        {/* 금액 / 주수 입력 */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '13px', color: theme.text.secondary }}>
              투자 금액 ({isKRW ? 'KRW' : 'USD'})
            </label>
            <input
              type="text" inputMode="decimal"
              value={amountRaw}
              onChange={handleAmountChange}
              placeholder={isKRW ? '1,000,000' : '1,000.00'}
              style={{ ...inputStyle, width: '100%', marginTop: '6px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', color: theme.text.secondary }}>주 수</label>
            <input
              type="text" inputMode="decimal"
              value={sharesRaw}
              onChange={handleSharesChange}
              placeholder="0.0000"
              style={{ ...inputStyle, width: '100%', marginTop: '6px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* 환산 미리보기 */}
        {priceInfo && sharesNum > 0 && amountNum > 0 && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: theme.text.muted }}>
            {isKRW
              ? <>≈ <span style={{ color: theme.text.secondary }}>{formatUSD(amountNum / priceInfo.exchangeRate)}</span> · <span style={{ color: theme.text.secondary }}>{sharesNum.toFixed(6).replace(/\.?0+$/, '')}주</span></>
              : <>≈ <span style={{ color: theme.text.secondary }}>{formatKRW(amountNum * priceInfo.exchangeRate)}</span> · <span style={{ color: theme.text.secondary }}>{sharesNum.toFixed(6).replace(/\.?0+$/, '')}주</span></>
            }
          </div>
        )}

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'transparent', color: theme.text.secondary, cursor: 'pointer', fontSize: '14px' }}>
            취소
          </button>
          <button
            onClick={handleBuy} disabled={!isValid || submitting}
            style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: theme.up, color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: !isValid ? 0.4 : 1 }}
          >
            {submitting ? '처리 중...' : '매수'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
