import { useStock } from '../../context/StockContext'
import { useNavigation, Page } from '../../context/NavigationContext'
import { useTheme } from '../../context/ThemeContext'
import StockSearch from '../StockSearch'

const TABS: { label: string; page: Page }[] = [
  { label: '홈', page: 'home' },
  { label: '종목 목록', page: 'screener' },
  { label: '종목 비교', page: 'compare' },
  { label: '포트폴리오', page: 'portfolio' },
  { label: '거래내역', page: 'transactions' },
  { label: '즐겨찾기', page: 'favorites' },
  { label: '도움말', page: 'help' },
]

export default function Navbar() {
  const { initQuote } = useStock()
  const { currentPage, setPage } = useNavigation()
  const { theme, isDark, toggleTheme } = useTheme()

  function handleTabClick(page: Page) {
    setPage(page)
    if (page === 'home') initQuote()
  }

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: '60px',
      background: theme.bg.root, borderBottom: `1px solid ${theme.bg.card}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <span
          style={{ fontSize: '18px', fontWeight: 700, color: theme.text.primary, cursor: 'pointer' }}
          onClick={() => handleTabClick('home')}
        >
          Stock Vibe
        </span>
        <nav style={{ display: 'flex', gap: '4px' }}>
          {TABS.map(({ label, page }) => (
            <button
              key={page}
              onClick={() => handleTabClick(page)}
              style={{
                padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px',
                background: currentPage === page ? theme.bg.card : 'transparent',
                color: currentPage === page ? theme.text.primary : theme.text.muted,
                fontWeight: currentPage === page ? 600 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '360px' }}>
          <StockSearch />
        </div>
        <button
          onClick={toggleTheme}
          style={{
            padding: '6px 12px', borderRadius: '8px', border: `1px solid ${theme.border}`,
            background: 'transparent', color: theme.text.secondary,
            cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap',
          }}
        >
          {isDark ? '☀️ 라이트' : '🌙 다크'}
        </button>
      </div>
    </header>
  )
}
