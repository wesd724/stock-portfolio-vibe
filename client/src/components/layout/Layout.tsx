import { ReactNode } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

interface Props {
  children: ReactNode
}

export default function Layout({ children }: Props) {
  return (
    <>
      <Navbar />
      <Sidebar />
      <main style={{
        marginTop: '60px',
        marginLeft: '220px',
        padding: '32px',
        minHeight: 'calc(100vh - 60px)',
      }}>
        {children}
      </main>
    </>
  )
}
