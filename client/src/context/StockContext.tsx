import { create } from 'zustand'
import { StockQuote } from '../types/stock'

interface StockStore {
  selectedQuote: StockQuote | null
  setSelectedQuote: (quote: StockQuote | null) => void
  initQuote: () => void
  refreshQuote: () => Promise<void>
}

/*
{함수이름}: (매개변수) => 반환타입,
{함수이름}(매개변수): 반환타입
차이없음*/ 

export const useStock = create<StockStore>((set, get) => ({
  selectedQuote: null,
  setSelectedQuote: (quote) => set({ selectedQuote: quote }),
  initQuote: () => set({ selectedQuote: null }),
  refreshQuote: async () => {
    const symbol = get().selectedQuote?.symbol
    if (!symbol) return
    const res = await fetch(`/api/stocks/quote/${symbol}`)
    if (res.ok) set({ selectedQuote: await res.json() })
  },
}))
