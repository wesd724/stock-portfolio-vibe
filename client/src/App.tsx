import { useEffect } from 'react'
import Layout from './components/layout/Layout'
import MainContent from './components/MainContent'
import { usePortfolio } from './context/PortfolioContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import "./styles/index.css"

function AppInner() {
  const init = usePortfolio((s) => s.init)
  const { theme } = useTheme()

  useEffect(() => { init() }, [])

  useEffect(() => {
    document.body.style.backgroundColor = theme.bg.root
    document.body.style.color = theme.text.primary
  }, [theme])

  return (
    <Layout>
      <MainContent />
    </Layout>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  )
}

export default App
