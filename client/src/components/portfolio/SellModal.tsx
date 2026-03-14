import { useState } from 'react'
import { createPortal } from 'react-dom'
import { usePortfolio } from '../../context/PortfolioContext'
import { useTheme } from '../../context/ThemeContext'
import { Transaction } from '../../types/portfolio'

interface Props {
  symbol: string
  name: string
  maxShares: number
  minDate: string
  onClose: () => void
}

const today = new Date().toISOString().split('T')[0]

export default function SellModal({ symbol, name, maxShares, minDate, onClose }: Props) {
  const [date, setDate] = useState(today)
  const [shares, setShares] = useState('')
  const [priceInfo, setPriceInfo] = useState<{ price: number; actualDate: string } | null>(null)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { addTransaction } = usePortfolio()
  const { theme } = useTheme()

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
      const res = await fetch(`/api/stocks/price-at/${symbol}?date=${date}`)
      if (!res.ok) throw new Error('해당 날짜 주가를 찾을 수 없습니다.')
      const data = await res.json()
      setPriceInfo({ price: data.price, actualDate: data.date })
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setLoadingPrice(false)
    }
  }

  async function handleSell() {
    if (!priceInfo || !shares) return
    const sharesNum = parseFloat(shares)
    if (sharesNum <= 0 || sharesNum > maxShares) return

    setSubmitting(true)
    const tx: Transaction = {
      id: crypto.randomUUID(),
      type: 'SELL',
      symbol,
      name,
      date: priceInfo.actualDate,
      priceAtDate: priceInfo.price,
      shares: sharesNum,
      amount: priceInfo.price * sharesNum,
      createdAt: Date.now(),
    }
    await addTransaction(tx)
    setSubmitting(false)
    onClose()
  }

  const sharesNum = parseFloat(shares)
  const sellAmount = priceInfo && shares ? priceInfo.price * sharesNum : null
  const isValid = priceInfo && shares && sharesNum > 0 && sharesNum <= maxShares + 1e-9 && date >= minDate

  return createPortal(
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: theme.overlay, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
    >
      <div style={{ background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '440px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '4px', color: theme.text.primary }}>매도</h2>
        <p style={{ fontSize: '13px', color: theme.text.muted, marginBottom: '20px' }}>{symbol} · {name} · 보유 {maxShares.toFixed(4)}주</p>

        {/* 날짜 */}
        <label style={{ fontSize: '13px', color: theme.text.secondary }}>매도 날짜</label>
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', marginBottom: '16px' }}>
          <input
            type="date"
            value={date}
            max={today}
            min={minDate}
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

        {priceInfo && (
          <div style={{ background: theme.bg.input, borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px' }}>
            <span style={{ color: theme.text.muted }}>{priceInfo.actualDate} 종가 </span>
            <span style={{ color: theme.text.primary, fontWeight: 600 }}>${priceInfo.price.toFixed(2)}</span>
          </div>
        )}

        {error && <p style={{ color: theme.down, fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

        {/* 수량 */}
        <label style={{ fontSize: '13px', color: theme.text.secondary }}>매도 수량</label>
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
          <input
            type="number"
            value={shares}
            min="0.0001"
            max={maxShares}
            step="0.0001"
            onChange={(e) => setShares(e.target.value)}
            placeholder="0.0000"
            style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bg.input, color: theme.text.primary, fontSize: '14px' }}
          />
          <button
            onClick={() => setShares((Math.floor(maxShares * 10000) / 10000).toFixed(4))}
            style={{ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'transparent', color: theme.text.secondary, cursor: 'pointer', fontSize: '13px' }}
          >
            전량
          </button>
        </div>

        {sharesNum > maxShares + 1e-9 && (
          <p style={{ color: theme.down, fontSize: '12px', marginTop: '6px' }}>보유 수량을 초과했습니다.</p>
        )}

        {sellAmount != null && sellAmount > 0 && (
          <p style={{ fontSize: '13px', color: theme.text.muted, marginTop: '8px' }}>
            예상 매도금액: <span style={{ color: theme.text.primary }}>${sellAmount.toFixed(2)}</span>
          </p>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'transparent', color: theme.text.secondary, cursor: 'pointer', fontSize: '14px' }}>
            취소
          </button>
          <button
            onClick={handleSell}
            disabled={!isValid || submitting}
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
