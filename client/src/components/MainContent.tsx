import { useStock } from '../context/StockContext'
import { useNavigation } from '../context/NavigationContext'
import StockCard from './StockCard'
import StockChart from './StockChart'
import StockNews from './StockNews'
import MarketOverview from './market/MarketOverview'
import GlobalNews from './news/GlobalNews'
import PortfolioPage from './portfolio/PortfolioPage'
import TransactionHistoryPage from './portfolio/TransactionHistoryPage'
import ComparisonPage from './comparison/ComparisonPage'
import ScreenerPage from './screener/ScreenerPage'

export default function MainContent() {
  const { selectedQuote } = useStock()
  const { currentPage } = useNavigation()

  if (currentPage === 'portfolio') return <PortfolioPage />
  if (currentPage === 'transactions') return <TransactionHistoryPage />
  if (currentPage === 'compare') return <ComparisonPage />
  if (currentPage === 'screener') return <ScreenerPage />

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
          <MarketOverview />
          <GlobalNews />
        </>
      )}
    </div>
  )
}
