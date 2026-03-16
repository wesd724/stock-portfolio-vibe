import { useState } from 'react'
import { useStock } from '../../context/StockContext'
import { useNavigation, Page } from '../../context/NavigationContext'
import { useTheme } from '../../context/ThemeContext'
import { useWindowSize } from '../../hooks/useWindowSize'
import StockSearch from '../StockSearch'

const TABS: { label: string; page: Page }[] = [
  { label: '홈', page: 'home' },
  { label: '종목 목록', page: 'screener' },
  { label: '종목 비교', page: 'compare' },
  { label: '포트폴리오', page: 'portfolio' },
  { label: '거래내역', page: 'transactions' },
  { label: '즐겨찾기', page: 'favorites' },
  { label: '투자 방식', page: 'investment' },
  { label: '도움말', page: 'help' },
]

export default function Navbar() {
  const { initQuote } = useStock()
  const { currentPage, setPage } = useNavigation()
  const { theme, isDark, toggleTheme } = useTheme()
  const { useHamburger } = useWindowSize()
  const [menuOpen, setMenuOpen] = useState(false)

  function handleTabClick(page: Page) {
    setPage(page)
    if (page === 'home') initQuote()
    setMenuOpen(false)
  }

  return (
    <>
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '60px',
        background: theme.bg.root, borderBottom: `1px solid ${theme.bg.card}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
          <span
            style={{ fontSize: '18px', fontWeight: 700, color: theme.text.primary, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
            onClick={() => handleTabClick('home')}
          >
            Stock Vibe
          </span>
          {!useHamburger && (
            <nav style={{ display: 'flex', gap: '2px' }}>
              {TABS.map(({ label, page }) => (
                <button
                  key={page}
                  onClick={() => handleTabClick(page)}
                  style={{
                    padding: '6px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px',
                    background: currentPage === page ? theme.bg.card : 'transparent',
                    color: currentPage === page ? theme.text.primary : theme.text.muted,
                    fontWeight: currentPage === page ? 600 : 400,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </button>
              ))}
            </nav>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {!useHamburger && (
            <div style={{ width: '280px' }}>
              <StockSearch onSelect={() => {}} />
            </div>
          )}
          <button
            onClick={toggleTheme}
            style={{
              padding: '6px 10px', borderRadius: '8px', border: `1px solid ${theme.border}`,
              background: 'transparent', color: theme.text.secondary,
              cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap',
            }}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          {useHamburger && (
            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                padding: '6px 10px', borderRadius: '8px',
                border: `1px solid ${theme.border}`,
                background: menuOpen ? theme.bg.card : 'transparent',
                color: theme.text.primary, cursor: 'pointer', fontSize: '18px',
                lineHeight: 1,
              }}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          )}
        </div>
      </header>

      {/* Mobile/tablet menu backdrop */}
      {useHamburger && menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, top: '60px', zIndex: 97 }}
        />
      )}

      {/* Mobile/tablet dropdown menu */}
      {useHamburger && menuOpen && (
        <div style={{
          position: 'fixed', top: '60px', left: 0, right: 0, zIndex: 99,
          background: theme.bg.root, borderBottom: `2px solid ${theme.border}`,
          padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
          maxHeight: 'calc(100vh - 60px)', overflowY: 'auto',
        }}>
          <StockSearch onSelect={() => setMenuOpen(false)} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '4px' }}>
            {TABS.map(({ label, page }) => (
              <button
                key={page}
                onClick={() => handleTabClick(page)}
                style={{
                  padding: '10px 8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px',
                  background: currentPage === page ? theme.bg.card : 'transparent',
                  color: currentPage === page ? theme.text.primary : theme.text.muted,
                  fontWeight: currentPage === page ? 600 : 400,
                  textAlign: 'center',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
