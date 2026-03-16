import { useState } from 'react'
import { useStock } from '../context/StockContext'
import { useNavigation } from '../context/NavigationContext'
import { useTheme } from '../context/ThemeContext'
import StockCard from './StockCard'
import StockChart from './StockChart'
import StockNews from './StockNews'
import MarketOverview from './market/MarketOverview'
import GlobalNews from './news/GlobalNews'
import PortfolioPage from './portfolio/PortfolioPage'
import TransactionHistoryPage from './portfolio/TransactionHistoryPage'
import ComparisonPage from './comparison/ComparisonPage'
import ScreenerPage from './screener/ScreenerPage'
import FavoritesPage from './favorites/FavoritesPage'
import HelpPage from './help/HelpPage'
import InvestmentPage from './investment/InvestmentPage'

type HomeTab = 'market' | 'news'

export default function MainContent() {
  const { selectedQuote } = useStock()
  const { currentPage } = useNavigation()
  const { theme } = useTheme()
  const [homeTab, setHomeTab] = useState<HomeTab>('market')

  if (currentPage === 'portfolio') return <PortfolioPage />
  if (currentPage === 'transactions') return <TransactionHistoryPage />
  if (currentPage === 'compare') return <ComparisonPage />
  if (currentPage === 'screener') return <ScreenerPage />
  if (currentPage === 'favorites') return <FavoritesPage />
  if (currentPage === 'help') return <HelpPage />
  if (currentPage === 'investment') return <InvestmentPage />

  return (
    <div>
      {selectedQuote ? (
        <>
          <StockCard quote={selectedQuote} />
          <StockChart symbol={selectedQuote.symbol} isPositive={selectedQuote.change >= 0} />
          <StockNews symbol={selectedQuote.symbol} />
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '0' }}>
            {(['market', 'news'] as HomeTab[]).map((tab) => {
              const label = tab === 'market' ? '시장 현황' : '국제 뉴스'
              const active = homeTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => setHomeTab(tab)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: active ? 600 : 400,
                    color: active ? theme.text.primary : theme.text.muted,
                    background: 'none',
                    border: 'none',
                    borderBottom: active ? `2px solid ${theme.text.primary}` : '2px solid transparent',
                    marginBottom: '-1px',
                    cursor: 'pointer',
                    transition: 'color 0.15s',
                  }}
                >{label}</button>
              )
            })}
          </div>
          {homeTab === 'market' ? <MarketOverview /> : <GlobalNews />}
        </>
      )}
    </div>
  )
}
