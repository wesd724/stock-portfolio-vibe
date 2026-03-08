export interface StockQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap: number
  currency: string
}

export interface StockSearchResult {
  symbol: string
  name: string
  exchange: string
}
