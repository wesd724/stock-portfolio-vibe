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
  accountBalance: number  // USD 기준 계좌 잔액

  init: () => Promise<void>
  addTransaction: (tx: Transaction) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  refreshCurrentPrices: () => Promise<void>
  toggleDisplayCurrency: () => void
  setAccountBalance: (balance: number) => void
  getSummary: () => {
    totalCost: number; totalValue: number; gainLoss: number; gainLossPercent: number
    totalCostKrw: number; totalValueKrw: number; gainLossKrw: number; gainLossPercentKrw: number
    fxGainLossKrw: number; priceGainLossKrw: number
  }
}

const BALANCE_KEY = 'stock-account-balance'

function loadBalance(): number {
  const v = localStorage.getItem(BALANCE_KEY)
  return v !== null ? parseFloat(v) : 0
}

function saveBalance(balance: number) {
  localStorage.setItem(BALANCE_KEY, String(balance))
}

export const usePortfolio = create<PortfolioStore>((set, get) => ({
  transactions: [],
  holdings: [],
  isInitialized: false,
  currentUSDKRW: 1300,
  displayCurrency: 'USD',
  accountBalance: loadBalance(),

  init: async () => {
    const storage = getStorage()
    const transactions = await storage.load()
    const forexResult = await fetch('/api/stocks/forex/current').then((r) => r.json()).catch(() => ({ rate: 1300 }))
    const currentUSDKRW: number = forexResult.rate ?? 1300
    const holdings = computeHoldings(transactions, {}, currentUSDKRW)
    set({ transactions, holdings, isInitialized: true, accountBalance: loadBalance(), currentUSDKRW })
    if (transactions.length > 0) {
      await get().refreshCurrentPrices()
    }
  },

  addTransaction: async (tx) => {
    const storage = getStorage()
    await storage.add(tx)
    const transactions = [...get().transactions, tx]
    const delta = tx.type === 'BUY' ? -tx.amount : tx.amount
    const newBalance = get().accountBalance + delta
    saveBalance(newBalance)
    set({ transactions, accountBalance: newBalance })
    get().refreshCurrentPrices().catch(() => {})
  },

  removeTransaction: async (id) => {
    const storage = getStorage()
    // 취소된 거래만큼 잔액 복구
    const tx = get().transactions.find((t) => t.id === id)
    if (tx) {
      const delta = tx.type === 'BUY' ? tx.amount : -tx.amount
      const newBalance = get().accountBalance + delta
      saveBalance(newBalance)
      set({ accountBalance: newBalance })
    }
    await storage.remove(id)
    const transactions = get().transactions.filter((t) => t.id !== id)
    set({ transactions })
    get().refreshCurrentPrices().catch(() => {})
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

  setAccountBalance: (balance) => {
    saveBalance(balance)
    set({ accountBalance: balance })
  },

  getSummary: () => computeSummary(get().holdings, get().currentUSDKRW),
}))
