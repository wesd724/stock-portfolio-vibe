import { usePortfolio } from '../../context/PortfolioContext'

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function TransactionHistoryPage() {
  const { transactions, removeTransaction } = usePortfolio()

  const sorted = [...transactions].sort((a, b) => b.createdAt - a.createdAt)

  if (sorted.length === 0) {
    return <p style={{ color: '#475569', fontSize: '15px' }}>거래 내역이 없습니다.</p>
  }

  return (
    <div>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#0f172a', color: '#64748b' }}>
              {['날짜', '종목', '구분', '체결가', '수량', '거래금액', ''].map((h, i) => (
                <th key={i} style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((tx) => (
              <tr key={tx.id} style={{ borderTop: '1px solid #334155' }}>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#94a3b8' }}>{tx.date}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <div style={{ fontWeight: 700 }}>{tx.symbol}</div>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>{tx.name}</div>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                    background: tx.type === 'BUY' ? '#166534' : '#7f1d1d',
                    color: tx.type === 'BUY' ? '#22c55e' : '#ef4444',
                  }}>
                    {tx.type === 'BUY' ? '매수' : '매도'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#f1f5f9' }}>${fmt(tx.priceAtDate)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#f1f5f9' }}>{tx.shares.toFixed(4)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#f1f5f9' }}>${fmt(tx.amount)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button
                    onClick={() => removeTransaction(tx.id)}
                    style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #334155', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '12px' }}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
