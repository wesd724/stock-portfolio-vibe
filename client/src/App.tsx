import { useEffect } from 'react'
import Layout from './components/layout/Layout'
import MainContent from './components/MainContent'
import { usePortfolio } from './context/PortfolioContext'
import "./styles/index.css"

function App() {
  const init = usePortfolio((s) => s.init)

  useEffect(() => { init() }, [])

  return (
    <Layout>
      <MainContent />
    </Layout>
  )
}

export default App
