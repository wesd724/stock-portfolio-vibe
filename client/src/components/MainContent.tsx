import { useStock } from '../context/StockContext'
import { useNavigation } from '../context/NavigationContext'
import StockCard from './StockCard'
import StockChart from './StockChart'
import StockNews from './StockNews'
import MarketOverview from './market/MarketOverview'
import PortfolioPage from './portfolio/PortfolioPage'
import TransactionHistoryPage from './portfolio/TransactionHistoryPage'

export default function MainContent() {
  const { selectedQuote } = useStock()
  const { currentPage } = useNavigation()

  if (currentPage === 'portfolio') return <PortfolioPage />
  if (currentPage === 'transactions') return <TransactionHistoryPage />

  return (
    <div>
      {selectedQuote ? (
        <>
          <StockCard quote={selectedQuote} />
          <StockChart symbol={selectedQuote.symbol} isPositive={selectedQuote.change >= 0} />
          <StockNews symbol={selectedQuote.symbol} />
        </>
      ) : (
        <MarketOverview />
      )}
    </div>
  )
}
