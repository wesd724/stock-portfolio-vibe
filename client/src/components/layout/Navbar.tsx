import { useStock } from '../../context/StockContext'
import { useNavigation, Page } from '../../context/NavigationContext'
import StockSearch from '../StockSearch'

const TABS: { label: string; page: Page }[] = [
  { label: '홈', page: 'home' },
  { label: '포트폴리오', page: 'portfolio' },
  { label: '거래내역', page: 'transactions' },
  { label: '종목 비교', page: 'compare' },
]

export default function Navbar() {
  const { initQuote } = useStock()
  const { currentPage, setPage } = useNavigation()

  function handleTabClick(page: Page) {
    setPage(page)
    if (page === 'home') initQuote()
  }

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: '60px',
      background: '#0f172a', borderBottom: '1px solid #1e293b',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <span
          style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', cursor: 'pointer' }}
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
                background: currentPage === page ? '#1e293b' : 'transparent',
                color: currentPage === page ? '#f1f5f9' : '#64748b',
                fontWeight: currentPage === page ? 600 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
      <div style={{ width: '360px' }}>
        <StockSearch />
      </div>
    </header>
  )
}
