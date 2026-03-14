import { ReactNode, useState } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

interface Props {
  children: ReactNode
}

export default function Layout({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <>
      <Navbar />
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />
      <main style={{
        marginTop: '60px',
        marginLeft: sidebarOpen ? '220px' : '40px',
        padding: '32px',
        minHeight: 'calc(100vh - 60px)',
        transition: 'margin-left 0.2s ease',
      }}>
        {children}
      </main>
    </>
  )
}
