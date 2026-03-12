import UserInfo from '../user/UserInfo'
import HoldingItem from '../portfolio/HoldingItem'
import { usePortfolio } from '../../context/PortfolioContext'

export default function Sidebar() {
  const { holdings, refreshCurrentPrices } = usePortfolio()

  return (
    <aside style={{
      position: 'fixed',
      top: '60px',
      left: 0,
      bottom: 0,
      width: '220px',
      background: '#0f172a',
      borderRight: '1px solid #1e293b',
      overflowY: 'auto',
    }}>
      <UserInfo />
      <div style={{ padding: '12px 16px 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            보유 종목
          </span>
          <button
            onClick={refreshCurrentPrices}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '14px', padding: '2px' }}
            title="현재가 새로고침"
          >
            ↻
          </button>
        </div>
      </div>
      {holdings.length === 0 ? (
        <p style={{ fontSize: '12px', color: '#475569', padding: '0 16px' }}>보유 종목 없음</p>
      ) : (
        holdings.map((h) => <HoldingItem key={h.symbol} holding={h} />)
      )}
    </aside>
  )
}
