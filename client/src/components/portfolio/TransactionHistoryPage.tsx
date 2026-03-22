import { usePortfolio } from '../../context/PortfolioContext'
import { useTheme } from '../../context/ThemeContext'

function formatKRW(amount: number): string {
  return '₩' + Math.round(amount).toLocaleString('ko-KR')
}

function formatUSD(amount: number): string {
  return '$' + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function TransactionHistoryPage() {
  const { transactions, removeTransaction, displayCurrency } = usePortfolio()
  const { theme } = useTheme()

  const sorted = [...transactions].sort((a, b) => b.createdAt - a.createdAt)

  if (sorted.length === 0) {
    return (
      <div style={{ background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '48px', textAlign: 'center', color: theme.text.muted, fontSize: '14px' }}>
        거래 내역이 없습니다.
      </div>
    )
  }

  const isKRW = displayCurrency === 'KRW'

  return (
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
                        onClick={() => removeTransaction(tx.id)}
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
  )
}
