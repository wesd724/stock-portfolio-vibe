import { useState } from 'react'
import { createPortal } from 'react-dom'
import { usePortfolio } from '../../context/PortfolioContext'
import { useTheme } from '../../context/ThemeContext'
import { useWindowSize } from '../../hooks/useWindowSize'

function formatKRW(amount: number): string {
  return '₩' + Math.round(amount).toLocaleString('ko-KR')
}

function formatUSD(amount: number): string {
  return '$' + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function TransactionHistoryPage() {
  const { transactions, removeTransaction, displayCurrency } = usePortfolio()
  const { theme } = useTheme()
  const { isMobile } = useWindowSize()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const sorted = [...transactions].sort((a, b) => b.createdAt - a.createdAt)

  const confirmModal = confirmId
    ? <ConfirmDeleteModal
        onConfirm={() => { removeTransaction(confirmId); setConfirmId(null) }}
        onCancel={() => setConfirmId(null)}
        theme={theme}
      />
    : null

  if (sorted.length === 0) {
    return (
      <>
        {confirmModal}
        <div style={{ background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '48px', textAlign: 'center', color: theme.text.muted, fontSize: '14px' }}>
          거래 내역이 없습니다.
        </div>
      </>
    )
  }

  const isKRW = displayCurrency === 'KRW'

  /* ── 모바일: 카드 레이아웃 ── */
  if (isMobile) {
    return (
      <>
      {confirmModal}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sorted.map((tx) => {
          const rate = tx.exchangeRate || 0
          const amountDisplay = isKRW && rate > 0 ? formatKRW(tx.amount * rate) : formatUSD(tx.amount)
          const rateDisplay = rate > 0 ? `${rate.toLocaleString('ko-KR')}원` : '-'
          const isBuy = tx.type === 'BUY'

          return (
            <div key={tx.id} style={{
              background: theme.bg.card, border: `1px solid ${theme.border}`,
              borderRadius: '10px', padding: '14px 16px',
            }}>
              {/* 상단: 날짜 + 구분 + 삭제 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: theme.text.muted }}>{tx.date}</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                    background: isBuy ? theme.upBg : theme.downBg,
                    color: isBuy ? theme.up : theme.down,
                  }}>{isBuy ? '매수' : '매도'}</span>
                </div>
                <button
                  onClick={() => setConfirmId(tx.id)}
                  style={{ padding: '3px 8px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: 'transparent', color: theme.text.muted, cursor: 'pointer', fontSize: '11px' }}
                >삭제</button>
              </div>
              {/* 종목 */}
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, color: theme.text.primary, fontSize: '14px' }}>{tx.symbol}</span>
                <span style={{ marginLeft: '6px', fontSize: '12px', color: theme.text.muted }}>{tx.name}</span>
              </div>
              {/* 상세 정보 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: theme.text.muted }}>체결가  </span>
                  <span style={{ color: theme.text.primary }}>${tx.priceAtDate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span style={{ color: theme.text.muted }}>수량  </span>
                  <span style={{ color: theme.text.primary }}>{tx.shares.toFixed(4)}주</span>
                </div>
                <div>
                  <span style={{ color: theme.text.muted }}>거래금액  </span>
                  <span style={{ color: theme.text.primary }}>{amountDisplay}</span>
                </div>
                <div>
                  <span style={{ color: theme.text.muted }}>환율  </span>
                  <span style={{ color: theme.text.muted }}>{rateDisplay}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      </>
    )
  }

  /* ── PC: 기존 테이블 ── */
  return (
    <>
    {confirmModal}
    <div>
      <div style={{ background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '620px', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: theme.bg.input, color: theme.text.muted }}>
                {['날짜', '종목', '구분', '체결가', '수량', '거래금액', '환율', ''].map((h, i) => (
                  <th key={i} style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((tx) => {
                const rate = tx.exchangeRate || 0
                const amountDisplay = isKRW && rate > 0
                  ? formatKRW(tx.amount * rate)
                  : formatUSD(tx.amount)
                const rateDisplay = rate > 0 ? `${rate.toLocaleString('ko-KR')}원` : '-'

                return (
                  <tr key={tx.id} style={{ borderTop: `1px solid ${theme.border}` }}>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: theme.text.secondary, whiteSpace: 'nowrap' }}>{tx.date}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: theme.text.primary }}>{tx.symbol}</div>
                      <div style={{ color: theme.text.muted, fontSize: '11px' }}>{tx.name}</div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                        background: tx.type === 'BUY' ? theme.upBg : theme.downBg,
                        color: tx.type === 'BUY' ? theme.up : theme.down,
                      }}>
                        {tx.type === 'BUY' ? '매수' : '매도'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: theme.text.primary }}>${tx.priceAtDate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: theme.text.primary }}>{tx.shares.toFixed(4)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: theme.text.primary }}>{amountDisplay}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: theme.text.muted, whiteSpace: 'nowrap' }}>{rateDisplay}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => setConfirmId(tx.id)}
                        style={{ padding: '4px 10px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: 'transparent', color: theme.text.muted, cursor: 'pointer', fontSize: '12px' }}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </>
  )
}

function ConfirmDeleteModal({ onConfirm, onCancel, theme }: { onConfirm: () => void; onCancel: () => void; theme: any }) {
  return createPortal(
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
    >
      <div style={{ background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '320px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: theme.text.primary, marginBottom: '10px' }}>거래 내역 삭제</h2>
        <p style={{ fontSize: '13px', color: theme.text.secondary, marginBottom: '24px' }}>이 거래 내역을 삭제하시겠습니까?</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'transparent', color: theme.text.secondary, cursor: 'pointer', fontSize: '14px' }}
          >취소</button>
          <button
            onClick={onConfirm}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: theme.down, color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
          >삭제</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
