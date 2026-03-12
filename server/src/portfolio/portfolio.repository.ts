import { Injectable, Inject } from '@nestjs/common';
import Database from 'better-sqlite3';

export interface TransactionRow {
  id: string;
  user_id: string;
  type: 'BUY' | 'SELL';
  symbol: string;
  name: string;
  date: string;
  price_at_date: number;
  shares: number;
  amount: number;
  created_at: number;
}

@Injectable()
export class PortfolioRepository {
  constructor(@Inject('DATABASE') private readonly db: Database.Database) {}

  findByUserId(userId: string): TransactionRow[] {
    return this.db
      .prepare(
        'SELECT * FROM transactions WHERE user_id = ? ORDER BY date ASC, created_at ASC',
      )
      .all(userId) as TransactionRow[];
  }

  insert(row: TransactionRow): void {
    this.db
      .prepare(
        `INSERT INTO transactions
         (id, user_id, type, symbol, name, date, price_at_date, shares, amount, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        row.id,
        row.user_id,
        row.type,
        row.symbol,
        row.name,
        row.date,
        row.price_at_date,
        row.shares,
        row.amount,
        row.created_at,
      );
  }

  delete(id: string, userId: string): void {
    this.db
      .prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?')
      .run(id, userId);
  }
}
