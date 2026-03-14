import { create } from 'zustand'
import { Transaction, Holding } from '../types/portfolio'
import { computeHoldings, computeSummary } from '../utils/portfolioCalc'
import { getStorage } from '../storage'

interface PortfolioStore {
  transactions: Transaction[]
  holdings: Holding[]
  isInitialized: boolean
  currentUSDKRW: number
  displayCurrency: 'KRW' | 'USD'

  init: () => Promise<void>
  addTransaction: (tx: Transaction) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  refreshCurrentPrices: () => Promise<void>
  toggleDisplayCurrency: () => void
  getSummary: () => {
    totalCost: number; totalValue: number; gainLoss: number; gainLossPercent: number
    totalCostKrw: number; totalValueKrw: number; gainLossKrw: number; gainLossPercentKrw: number
    fxGainLossKrw: number; priceGainLossKrw: number
  }
}

export const usePortfolio = create<PortfolioStore>((set, get) => ({
  transactions: [],
  holdings: [],
  isInitialized: false,
  currentUSDKRW: 1300,
  displayCurrency: 'USD',

  init: async () => {
    const storage = getStorage()
    const transactions = await storage.load()
    const { currentUSDKRW } = get()
    const holdings = computeHoldings(transactions, {}, currentUSDKRW)
    set({ transactions, holdings, isInitialized: true })
    if (transactions.length > 0) {
      await get().refreshCurrentPrices()
    }
  },

  addTransaction: async (tx) => {
    const storage = getStorage()
    await storage.add(tx)
    const transactions = [...get().transactions, tx]
    set({ transactions })
    await get().refreshCurrentPrices()
  },

  removeTransaction: async (id) => {
    const storage = getStorage()
    await storage.remove(id)
    const transactions = get().transactions.filter((t) => t.id !== id)
    set({ transactions })
    await get().refreshCurrentPrices()
  },

  refreshCurrentPrices: async () => {
    const { transactions } = get()
    const symbols = [...new Set(transactions.map((t) => t.symbol))]
    if (symbols.length === 0) {
      set({ holdings: [] })
      return
    }

    const [priceResults, forexResult] = await Promise.all([
      Promise.allSettled(
        symbols.map((s) => fetch(`/api/stocks/quote/${s}`).then((r) => r.json())),
      ),
      fetch('/api/stocks/forex/current').then((r) => r.json()).catch(() => ({ rate: 1300 })),
    ])

    const currentUSDKRW: number = forexResult.rate ?? 1300

    const currentPrices: Record<string, number> = {}
    priceResults.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        currentPrices[symbols[i]] = result.value.price
      }
    })

    const holdings = computeHoldings(transactions, currentPrices, currentUSDKRW)
    set({ holdings, currentUSDKRW })
  },

  toggleDisplayCurrency: () => {
    set((state) => ({ displayCurrency: state.displayCurrency === 'KRW' ? 'USD' : 'KRW' }))
  },

  getSummary: () => computeSummary(get().holdings, get().currentUSDKRW),
}))
