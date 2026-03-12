import { useState } from 'react'
import { createPortal } from 'react-dom'
import { usePortfolio } from '../../context/PortfolioContext'
import { Transaction } from '../../types/portfolio'

interface Props {
  symbol: string
  name: string
  maxShares: number
  onClose: () => void
}

const today = new Date().toISOString().split('T')[0]

export default function SellModal({ symbol, name, maxShares, onClose }: Props) {
  const [date, setDate] = useState(today)
  const [shares, setShares] = useState('')
  const [priceInfo, setPriceInfo] = useState<{ price: number; actualDate: string } | null>(null)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { addTransaction } = usePortfolio()

  async function fetchPrice() {
    if (!date) return
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
  const isValid = priceInfo && shares && sharesNum > 0 && sharesNum <= maxShares

  return createPortal(
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '440px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '4px' }}>매도</h2>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>{symbol} · {name} · 보유 {maxShares.toFixed(4)}주</p>

        {/* 날짜 */}
        <label style={{ fontSize: '13px', color: '#94a3b8' }}>매도 날짜</label>
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', marginBottom: '16px' }}>
          <input
            type="date"
            value={date}
            max={today}
            min="1980-01-01"
            onChange={(e) => { setDate(e.target.value); setPriceInfo(null) }}
            style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: '14px' }}
          />
          <button
            onClick={fetchPrice}
            disabled={loadingPrice || !date}
            style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#334155', color: '#f1f5f9', cursor: 'pointer', fontSize: '13px' }}
          >
            {loadingPrice ? '조회 중...' : '가격 조회'}
          </button>
        </div>

        {priceInfo && (
          <div style={{ background: '#0f172a', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px' }}>
            <span style={{ color: '#64748b' }}>{priceInfo.actualDate} 종가 </span>
            <span style={{ color: '#f1f5f9', fontWeight: 600 }}>${priceInfo.price.toFixed(2)}</span>
          </div>
        )}

        {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

        {/* 수량 */}
        <label style={{ fontSize: '13px', color: '#94a3b8' }}>매도 수량</label>
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
          <input
            type="number"
            value={shares}
            min="0.0001"
            max={maxShares}
            step="0.0001"
            onChange={(e) => setShares(e.target.value)}
            placeholder="0.0000"
            style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: '14px' }}
          />
          <button
            onClick={() => setShares(maxShares.toFixed(4))}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '13px' }}
          >
            전량
          </button>
        </div>

        {sharesNum > maxShares && (
          <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>보유 수량을 초과했습니다.</p>
        )}

        {sellAmount != null && sellAmount > 0 && (
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
            예상 매도금액: <span style={{ color: '#f1f5f9' }}>${sellAmount.toFixed(2)}</span>
          </p>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}>
            취소
          </button>
          <button
            onClick={handleSell}
            disabled={!isValid || submitting}
            style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: !isValid ? 0.4 : 1 }}
          >
            {submitting ? '처리 중...' : '매도 확정'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
