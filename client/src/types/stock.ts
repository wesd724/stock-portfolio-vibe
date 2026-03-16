export interface StockQuote {
  symbol: string
  name: string
  currency: string
  marketState: string
  // 현재가
  price: number
  change: number
  changePercent: number
  // 당일
  open: number
  dayHigh: number
  dayLow: number
  volume: number
  // 시가총액 / 지표
  marketCap: number
  trailingPE?: number
  dividendYield?: number
  // 52주
  fiftyTwoWeekHigh: number
  fiftyTwoWeekLow: number
  // 프리/애프터장
  preMarketPrice?: number
  preMarketChange?: number
  preMarketChangePercent?: number
  postMarketPrice?: number
  postMarketChange?: number
  postMarketChangePercent?: number
  regularMarketTime?: number | null
}

export interface StockSearchResult {
  symbol: string
  name: string
  exchange: string
}

export interface ChartPoint {
  time: number
  close: number
}

export type ChartInterval = '1m' | '5m' | '1h' | '1d'

export interface NewsItem {
  title: string
  link: string
  publisher: string
  publishedAt: string
  source: 'yahoo' | 'google'
}

export interface MarketItem {
  symbol: string
  label: string
  price: number
  change: number
  changePercent: number
  currency: string
}
