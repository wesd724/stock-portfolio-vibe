export interface Transaction {
  id: string
  type: 'BUY' | 'SELL'
  symbol: string
  name: string
  date: string
  priceAtDate: number
  shares: number
  amount: number        // USD amount
  exchangeRate: number  // USDKRW at transaction date
  currency: 'USD' | 'KRW'  // what currency user used for input
  stockCurrency?: string    // 종목 원래 통화 ('USD' | 'KRW'), 없으면 'USD'로 간주
  createdAt: number
}

export interface Holding {
  symbol: string
  name: string
  totalShares: number
  avgCostPerShare: number
  totalCost: number        // USD cost basis
  avgBuyRate: number       // weighted avg USDKRW at buy time
  currentPrice: number
  currentValue: number     // USD
  gainLoss: number         // USD
  gainLossPercent: number  // USD basis
  // KRW fields (requires currentUSDKRW)
  currentValueKrw: number
  totalCostKrw: number     // cost at buy-time exchange rates
  gainLossKrw: number      // total KRW P&L
  gainLossPercentKrw: number
  fxGainLossKrw: number    // FX portion of KRW P&L
  priceGainLossKrw: number // price portion of KRW P&L
}
