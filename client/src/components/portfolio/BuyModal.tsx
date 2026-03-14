import { useState } from 'react'
import { createPortal } from 'react-dom'
import { usePortfolio } from '../../context/PortfolioContext'
import { useTheme } from '../../context/ThemeContext'
import { Transaction } from '../../types/portfolio'

interface Props {
  symbol: string
  name: string
  onClose: () => void
}

const today = new Date().toISOString().split('T')[0]

function formatKRW(amount: number): string {
  return '₩' + Math.round(amount).toLocaleString('ko-KR')
}

function formatUSD(amount: number): string {
  return '$' + amount.toFixed(2)
}

export default function BuyModal({ symbol, name, onClose }: Props) {
  const [date, setDate] = useState(today)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<'KRW' | 'USD'>('KRW')
  const [priceInfo, setPriceInfo] = useState<{ price: number; actualDate: string; exchangeRate: number } | null>(null)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { addTransaction } = usePortfolio()
  const { theme } = useTheme()

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
      setPriceInfo({ price: priceData.price, actualDate: priceData.date, exchangeRate })
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setLoadingPrice(false)
    }
  }

  async function handleBuy() {
    if (!priceInfo || !amount) return
    const amountNum = parseFloat(amount)
    if (amountNum <= 0) return

    setSubmitting(true)
    let shares: number
    let amountUSD: number

    if (currency === 'KRW') {
      amountUSD = amountNum / priceInfo.exchangeRate
      shares = amountUSD / priceInfo.price
    } else {
      amountUSD = amountNum
      shares = amountNum / priceInfo.price
    }

    const tx: Transaction = {
      id: crypto.randomUUID(),
      type: 'BUY',
      symbol,
      name,
      date: priceInfo.actualDate,
      priceAtDate: priceInfo.price,
      shares,
      amount: amountUSD,
      exchangeRate: priceInfo.exchangeRate,
      currency,
      createdAt: Date.now(),
    }
    await addTransaction(tx)
    setSubmitting(false)
    onClose()
  }

  const amountNum = amount ? parseFloat(amount) : 0
  let estimatedShares: number | null = null
  let estimatedUSD: number | null = null
  let estimatedKRW: number | null = null

  if (priceInfo && amountNum > 0) {
    if (currency === 'KRW') {
      const usd = amountNum / priceInfo.exchangeRate
      estimatedShares = usd / priceInfo.price
      estimatedUSD = usd
      estimatedKRW = amountNum
    } else {
      estimatedShares = amountNum / priceInfo.price
      estimatedUSD = amountNum
      estimatedKRW = amountNum * priceInfo.exchangeRate
    }
  }

  return createPortal(
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: theme.overlay, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
    >
      <div style={{ background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '440px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '4px', color: theme.text.primary }}>매수</h2>
        <p style={{ fontSize: '13px', color: theme.text.muted, marginBottom: '20px' }}>{symbol} · {name}</p>

        {/* 날짜 */}
        <label style={{ fontSize: '13px', color: theme.text.secondary }}>투자 날짜</label>
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', marginBottom: '16px' }}>
          <input
            type="date"
            value={date}
            max={today}
            min="1980-01-01"
            onChange={(e) => { setDate(e.target.value); setPriceInfo(null) }}
            style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bg.input, color: theme.text.primary, fontSize: '14px', colorScheme: 'dark' }}
          />
          <button
            onClick={fetchPrice}
            disabled={loadingPrice || !date}
            style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: theme.border, color: theme.text.primary, cursor: 'pointer', fontSize: '13px' }}
          >
            {loadingPrice ? '조회 중...' : '가격 조회'}
          </button>
        </div>

        {/* 가격 결과 */}
        {priceInfo && (
          <div style={{ background: theme.bg.input, borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px' }}>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ color: theme.text.muted }}>{priceInfo.actualDate} 종가  </span>
              <span style={{ color: theme.text.primary, fontWeight: 600 }}>{formatUSD(priceInfo.price)}</span>
              <span style={{ color: theme.text.muted }}>  ≈  </span>
              <span style={{ color: theme.text.primary, fontWeight: 600 }}>{formatKRW(priceInfo.price * priceInfo.exchangeRate)}</span>
            </div>
            <div>
              <span style={{ color: theme.text.muted }}>환율  </span>
              <span style={{ color: theme.text.primary }}>{priceInfo.exchangeRate.toLocaleString('ko-KR', { maximumFractionDigits: 1 })} 원/달러</span>
            </div>
          </div>
        )}

        {error && <p style={{ color: theme.down, fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

        {/* 통화 토글 */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          {(['KRW', 'USD'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              style={{
                padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${currency === c ? theme.up : theme.border}`,
                background: currency === c ? theme.upBg : 'transparent',
                color: currency === c ? theme.up : theme.text.secondary,
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* 투자금액 */}
        <label style={{ fontSize: '13px', color: theme.text.secondary }}>
          투자 금액 ({currency === 'KRW' ? 'KRW' : 'USD'})
        </label>
        <input
          type="number"
          value={amount}
          min="1"
          onChange={(e) => setAmount(e.target.value)}
          placeholder={currency === 'KRW' ? '예: 1000000' : '예: 1000'}
          style={{ width: '100%', marginTop: '6px', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bg.input, color: theme.text.primary, fontSize: '14px', boxSizing: 'border-box' }}
        />

        {/* 예상 수량 */}
        {estimatedShares != null && estimatedShares > 0 && (
          <p style={{ fontSize: '13px', color: theme.text.muted, marginTop: '8px' }}>
            예상 수량: <span style={{ color: theme.text.primary }}>{estimatedShares.toFixed(4)}주</span>
            {estimatedUSD != null && estimatedKRW != null && (
              <span style={{ marginLeft: '8px' }}>
                (USD: <span style={{ color: theme.text.primary }}>{formatUSD(estimatedUSD)}</span>
                {' | '}
                KRW: <span style={{ color: theme.text.primary }}>{formatKRW(estimatedKRW)}</span>)
              </span>
            )}
          </p>
        )}

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'transparent', color: theme.text.secondary, cursor: 'pointer', fontSize: '14px' }}>
            취소
          </button>
          <button
            onClick={handleBuy}
            disabled={!priceInfo || !amount || parseFloat(amount) <= 0 || submitting}
            style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: theme.up, color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: (!priceInfo || !amount || parseFloat(amount) <= 0) ? 0.4 : 1 }}
          >
            {submitting ? '처리 중...' : '매수'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
