import { Transaction } from '../types/portfolio'

export interface IPortfolioStorage {
  load(): Promise<Transaction[]>
  add(tx: Transaction): Promise<void>
  remove(id: string): Promise<void>
  clear(): Promise<void>
}
