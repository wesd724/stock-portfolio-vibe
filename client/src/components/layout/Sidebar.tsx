import UserInfo from '../user/UserInfo'
import HoldingItem from '../portfolio/HoldingItem'
import { usePortfolio } from '../../context/PortfolioContext'
import { useTheme } from '../../context/ThemeContext'

interface Props {
  isOpen: boolean
  onToggle: () => void
}

export default function Sidebar({ isOpen, onToggle }: Props) {
  const { holdings, refreshCurrentPrices } = usePortfolio()
  const { theme } = useTheme()

  return (
    <aside style={{
      position: 'fixed',
      top: '60px',
      left: 0,
      bottom: 0,
      width: isOpen ? '220px' : '40px',
      background: theme.bg.root,
      borderRight: `1px solid ${theme.bg.card}`,
      overflowY: isOpen ? 'auto' : 'hidden',
      overflowX: 'hidden',
      transition: 'width 0.2s ease',
      zIndex: 50,
    }}>
      {/* 토글 버튼 */}
      <button
        onClick={onToggle}
        title={isOpen ? '사이드바 닫기' : '사이드바 열기'}
        style={{
          position: 'absolute',
          top: '10px',
          right: '8px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: theme.text.muted,
          fontSize: '14px',
          padding: '2px 4px',
          zIndex: 1,
          lineHeight: 1,
        }}
      >
        {isOpen ? '◀' : '▶'}
      </button>

      {isOpen && (
        <>
          <UserInfo />
          <div style={{ padding: '12px 16px 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                보유 종목
              </span>
              <button
                onClick={refreshCurrentPrices}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text.muted, fontSize: '14px', padding: '2px' }}
                title="현재가 새로고침"
              >
                ↻
              </button>
            </div>
          </div>
          {holdings.length === 0 ? (
            <p style={{ fontSize: '12px', color: theme.text.secondary, padding: '0 16px' }}>보유 종목 없음</p>
          ) : (
            holdings.map((h) => <HoldingItem key={h.symbol} holding={h} />)
          )}
        </>
      )}
    </aside>
  )
}
