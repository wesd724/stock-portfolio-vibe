import { useState } from 'react'
import { usePortfolio } from '../../context/PortfolioContext'
import { Transaction } from '../../types/portfolio'

interface Props {
  symbol: string
  name: string
  onClose: () => void
}

const today = new Date().toISOString().split('T')[0]

export default function BuyModal({ symbol, name, onClose }: Props) {
  const [date, setDate] = useState(today)
  const [amount, setAmount] = useState('')
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

  async function handleBuy() {
    if (!priceInfo || !amount) return
    const amountNum = parseFloat(amount)
    if (amountNum <= 0) return

    setSubmitting(true)
    const shares = amountNum / priceInfo.price
    const tx: Transaction = {
      id: crypto.randomUUID(),
      type: 'BUY',
      symbol,
      name,
      date: priceInfo.actualDate,
      priceAtDate: priceInfo.price,
      shares,
      amount: amountNum,
      createdAt: Date.now(),
    }
    await addTransaction(tx)
    setSubmitting(false)
    onClose()
  }

  const shares = priceInfo && amount ? parseFloat(amount) / priceInfo.price : null

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '440px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '4px' }}>매수</h2>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>{symbol} · {name}</p>

        {/* 날짜 */}
        <label style={{ fontSize: '13px', color: '#94a3b8' }}>투자 날짜</label>
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

        {/* 가격 결과 */}
        {priceInfo && (
          <div style={{ background: '#0f172a', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px' }}>
            <span style={{ color: '#64748b' }}>{priceInfo.actualDate} 종가 </span>
            <span style={{ color: '#f1f5f9', fontWeight: 600 }}>${priceInfo.price.toFixed(2)}</span>
          </div>
        )}

        {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

        {/* 투자금액 */}
        <label style={{ fontSize: '13px', color: '#94a3b8' }}>투자 금액 (USD)</label>
        <input
          type="number"
          value={amount}
          min="1"
          onChange={(e) => setAmount(e.target.value)}
          placeholder="예: 1000"
          style={{ width: '100%', marginTop: '6px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: '14px', boxSizing: 'border-box' }}
        />

        {/* 예상 수량 */}
        {shares != null && shares > 0 && (
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
            예상 수량: <span style={{ color: '#f1f5f9' }}>{shares.toFixed(4)}주</span>
          </p>
        )}

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}>
            취소
          </button>
          <button
            onClick={handleBuy}
            disabled={!priceInfo || !amount || parseFloat(amount) <= 0 || submitting}
            style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: (!priceInfo || !amount || parseFloat(amount) <= 0) ? 0.4 : 1 }}
          >
            {submitting ? '처리 중...' : '매수 확정'}
          </button>
        </div>
      </div>
    </div>
  )
}
