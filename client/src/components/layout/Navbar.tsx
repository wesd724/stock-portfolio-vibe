import { useStock } from '../../context/StockContext'
import StockSearch from '../StockSearch'

export default function Navbar() {
  const { initQuote } = useStock();

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      background: '#0f172a',
      borderBottom: '1px solid #1e293b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 100,
    }}>
      <span style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9' }}
        onClick={initQuote}
      >
        Stock Vibe
      </span>
      <div style={{ width: '360px' }}>
        <StockSearch />
      </div>
    </header>
  )
}
