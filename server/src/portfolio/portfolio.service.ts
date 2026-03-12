import { Injectable } from '@nestjs/common';
import { PortfolioRepository } from './portfolio.repository';

export interface TransactionDto {
  id: string;
  type: 'BUY' | 'SELL';
  symbol: string;
  name: string;
  date: string;
  priceAtDate: number;
  shares: number;
  amount: number;
  createdAt: number;
}

@Injectable()
export class PortfolioService {
  constructor(private readonly repo: PortfolioRepository) {}

  getTransactions(userId: string): TransactionDto[] {
    return this.repo.findByUserId(userId).map((row) => ({
      id: row.id,
      type: row.type,
      symbol: row.symbol,
      name: row.name,
      date: row.date,
      priceAtDate: row.price_at_date,
      shares: row.shares,
      amount: row.amount,
      createdAt: row.created_at,
    }));
  }

  addTransaction(userId: string, tx: TransactionDto): TransactionDto {
    this.repo.insert({
      id: tx.id,
      user_id: userId,
      type: tx.type,
      symbol: tx.symbol,
      name: tx.name,
      date: tx.date,
      price_at_date: tx.priceAtDate,
      shares: tx.shares,
      amount: tx.amount,
      created_at: tx.createdAt,
    });
    return tx;
  }

  removeTransaction(userId: string, id: string): void {
    this.repo.delete(id, userId);
  }
}
