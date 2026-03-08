import { StockQuote } from '../types/stock'

interface Props {
  quote: StockQuote
}

function formatNumber(n: number) {
  if (n >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(2)}T`
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  return n.toLocaleString()
}

export default function StockCard({ quote }: Props) {
  const isPositive = quote.change >= 0

  return (
    <div style={{
      background: '#1e293b',
      borderRadius: '12px',
      padding: '20px 24px',
      marginTop: '16px',
      border: '1px solid #334155',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>{quote.symbol}</span>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginTop: '2px' }}>{quote.name}</h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>
            {quote.currency} {quote.price?.toFixed(2)}
          </div>
          <div style={{ color: isPositive ? '#22c55e' : '#ef4444', fontSize: '15px', marginTop: '2px' }}>
            {isPositive ? '+' : ''}{quote.change?.toFixed(2)} ({isPositive ? '+' : ''}{quote.changePercent?.toFixed(2)}%)
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '32px', marginTop: '16px', color: '#94a3b8', fontSize: '13px' }}>
        <div>
          <div>거래량</div>
          <div style={{ color: '#f1f5f9', marginTop: '2px' }}>{formatNumber(quote.volume)}</div>
        </div>
        <div>
          <div>시가총액</div>
          <div style={{ color: '#f1f5f9', marginTop: '2px' }}>{formatNumber(quote.marketCap)}</div>
        </div>
      </div>
    </div>
  )
}
