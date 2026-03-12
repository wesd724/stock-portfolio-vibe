import { IPortfolioStorage } from './IPortfolioStorage'
import { Transaction } from '../types/portfolio'

const KEY = 'portfolio_transactions'

export class SessionStorageAdapter implements IPortfolioStorage {
  async load(): Promise<Transaction[]> {
    try {
      const raw = sessionStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as Transaction[]) : []
    } catch {
      return []
    }
  }

  async add(tx: Transaction): Promise<void> {
    const txs = await this.load()
    txs.push(tx)
    sessionStorage.setItem(KEY, JSON.stringify(txs))
  }

  async remove(id: string): Promise<void> {
    const txs = await this.load()
    sessionStorage.setItem(KEY, JSON.stringify(txs.filter((t) => t.id !== id)))
  }

  async clear(): Promise<void> {
    sessionStorage.removeItem(KEY)
  }
}
