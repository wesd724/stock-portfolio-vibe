import StockSearch from './components/StockSearch'

function App() {
  return (
    <div style={{ padding: '40px 24px', maxWidth: '640px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Stock Vibe</h1>
      <p style={{ color: '#94a3b8', marginBottom: '24px' }}>미국주식 포트폴리오</p>
      <StockSearch />
    </div>
  )
}

export default App
