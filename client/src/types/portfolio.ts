export interface Transaction {
  id: string
  type: 'BUY' | 'SELL'
  symbol: string
  name: string
  date: string          // 'YYYY-MM-DD'
  priceAtDate: number
  shares: number
  amount: number        // priceAtDate * shares
  createdAt: number     // Date.now()
}

export interface Holding {
  symbol: string
  name: string
  totalShares: number
  avgCostPerShare: number
  totalCost: number
  currentPrice: number
  currentValue: number
  gainLoss: number
  gainLossPercent: number
}
