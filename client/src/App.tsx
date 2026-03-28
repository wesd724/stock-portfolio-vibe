import { useEffect } from 'react'
import { BrowserRouter, useSearchParams, useLocation } from 'react-router-dom'
import Layout from './components/layout/Layout'
import MainContent from './components/MainContent'
import { usePortfolio } from './context/PortfolioContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { useStock } from './context/StockContext'
import "./styles/index.css"

function StockSyncer() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { selectedQuote, setSelectedQuote } = useStock()
  const location = useLocation()
  const urlSymbol = searchParams.get('symbol')

  // URL → Store: home 경로에서 symbol 쿼리 변경 시 fetch
  useEffect(() => {
    if (location.pathname !== '/') return
    if (!urlSymbol) {
      if (selectedQuote) setSelectedQuote(null)
      return
    }
    if (urlSymbol === selectedQuote?.symbol) return
    fetch(`/api/stocks/quote/${urlSymbol}`)
      .then(r => r.ok ? r.json() : null)
      .then(q => q && setSelectedQuote(q))
  }, [urlSymbol, location.pathname])

  // Store → URL: selectedQuote 변경 시 home 경로의 symbol 쿼리 업데이트
  useEffect(() => {
    if (location.pathname !== '/') return
    const storeSymbol = selectedQuote?.symbol ?? null
    if (storeSymbol === urlSymbol) return
    if (storeSymbol) {
      setSearchParams({ symbol: storeSymbol }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }, [selectedQuote?.symbol, location.pathname])

  return null
}

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
      <StockSyncer />
      <MainContent />
    </Layout>
  )
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
