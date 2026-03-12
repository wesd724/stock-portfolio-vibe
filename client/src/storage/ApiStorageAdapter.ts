import { IPortfolioStorage } from './IPortfolioStorage'
import { Transaction } from '../types/portfolio'

// 로그인 유저용 스토리지 - 추후 auth 연동 시 userId 주입
export class ApiStorageAdapter implements IPortfolioStorage {
  constructor(private readonly userId: string) {}

  async load(): Promise<Transaction[]> {
    const res = await fetch(`/api/portfolio/transactions?userId=${this.userId}`)
    return res.json()
  }

  async add(tx: Transaction): Promise<void> {
    await fetch(`/api/portfolio/transactions?userId=${this.userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    })
  }

  async remove(id: string): Promise<void> {
    await fetch(`/api/portfolio/transactions/${id}?userId=${this.userId}`, {
      method: 'DELETE',
    })
  }

  async clear(): Promise<void> {
    const txs = await this.load()
    await Promise.all(txs.map((t) => this.remove(t.id)))
  }
}
