import { Global, Module } from '@nestjs/common';
import Database from 'better-sqlite3';
import path from 'path';

const DatabaseProvider = {
  provide: 'DATABASE',
  useFactory: () => {
    const db = new Database(path.join(process.cwd(), 'stock-vibe.db'));
    db.pragma('journal_mode = WAL');
    db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id          TEXT    PRIMARY KEY,
        user_id     TEXT    NOT NULL DEFAULT 'guest',
        type        TEXT    NOT NULL,
        symbol      TEXT    NOT NULL,
        name        TEXT    NOT NULL,
        date        TEXT    NOT NULL,
        price_at_date REAL  NOT NULL,
        shares      REAL    NOT NULL,
        amount      REAL    NOT NULL,
        created_at  INTEGER NOT NULL
      )
    `);
    return db;
  },
};

@Global()
@Module({
  providers: [DatabaseProvider],
  exports: [DatabaseProvider],
})
export class DatabaseModule {}
