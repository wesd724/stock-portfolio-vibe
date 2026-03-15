import { ReactNode, useState } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { useTheme } from '../../context/ThemeContext'
import { useWindowSize } from '../../hooks/useWindowSize'

interface Props {
  children: ReactNode
}

const SIDEBAR_WIDTH = 240
const COLLAPSED_WIDTH = 0

export default function Layout({ children }: Props) {
  const { isMobile } = useWindowSize()
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768)
  const { theme } = useTheme()

  return (
    <>
      <Navbar />
      {/* Mobile sidebar backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, top: '60px',
            background: 'rgba(0,0,0,0.5)', zIndex: 145,
          }}
        />
      )}
      <Sidebar isOpen={sidebarOpen} isMobile={isMobile} />
      {/* 토글 버튼 — 경계선 바깥에 위치 */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        title={sidebarOpen ? '사이드바 닫기' : '사이드바 열기'}
        style={{
          position: 'fixed',
          top: '80px',
          left: sidebarOpen ? `${SIDEBAR_WIDTH}px` : `${COLLAPSED_WIDTH}px`,
          transform: sidebarOpen ? 'translateX(-50%)' : 'translateX(0)',
          zIndex: 200,
          width: '20px',
          height: '40px',
          borderRadius: '0 6px 6px 0',
          border: `1px solid ${theme.border}`,
          borderLeft: 'none',
          background: theme.bg.card,
          color: theme.text.muted,
          cursor: 'pointer',
          fontSize: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'left 0.2s ease',
          padding: 0,
        }}
      >
        {sidebarOpen ? '◀' : '▶'}
      </button>
      <main style={{
        marginTop: '60px',
        marginLeft: isMobile ? 0 : (sidebarOpen ? `${SIDEBAR_WIDTH}px` : `${COLLAPSED_WIDTH}px`),
        padding: isMobile ? '16px' : '32px',
        minHeight: 'calc(100vh - 60px)',
        transition: 'margin-left 0.2s ease',
      }}>
        {children}
      </main>
    </>
  )
}
