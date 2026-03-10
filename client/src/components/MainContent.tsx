import { useStock } from '../context/StockContext'
import StockCard from './StockCard'

export default function MainContent() {
  const { selectedQuote } = useStock()
  console.log(selectedQuote)
  return (
    <div>
      {selectedQuote ? (
        <StockCard quote={selectedQuote} />
      ) : (
        <p style={{ color: '#475569', fontSize: '15px' }}>
          상단 검색창에서 종목을 검색해보세요.
        </p>
      )}
    </div>
  )
}
