import { create } from 'zustand'
import { Transaction, Holding } from '../types/portfolio'
import { computeHoldings, computeSummary } from '../utils/portfolioCalc'
import { getStorage } from '../storage'

interface PortfolioStore {
  transactions: Transaction[]
  holdings: Holding[]
  isInitialized: boolean

  init: () => Promise<void>
  addTransaction: (tx: Transaction) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  refreshCurrentPrices: () => Promise<void>
  getSummary: () => { totalCost: number; totalValue: number; gainLoss: number; gainLossPercent: number }
}

export const usePortfolio = create<PortfolioStore>((set, get) => ({
  transactions: [],
  holdings: [],
  isInitialized: false,

  init: async () => {
    const storage = getStorage()
    const transactions = await storage.load()
    const holdings = computeHoldings(transactions, {})
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

    const results = await Promise.allSettled(
      symbols.map((s) => fetch(`/api/stocks/quote/${s}`).then((r) => r.json())),
    )

    const currentPrices: Record<string, number> = {}
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        currentPrices[symbols[i]] = result.value.price
      }
    })

    const holdings = computeHoldings(transactions, currentPrices)
    set({ holdings })
  },

  getSummary: () => computeSummary(get().holdings),
}))
