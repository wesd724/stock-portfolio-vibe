import { Injectable } from '@nestjs/common';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance();

const MARKET_SYMBOLS = [
  { symbol: 'NQ=F', label: '나스닥100 선물' },
  { symbol: 'ES=F', label: 'S&P500 선물' },
  { symbol: '^KS11', label: '코스피' },
  { symbol: '^KQ11', label: '코스닥' },
  { symbol: 'KRW=X', label: 'USD/KRW' },
  { symbol: 'GC=F', label: '골드 선물' },
  { symbol: 'SI=F', label: '은 선물' },
  { symbol: 'CL=F', label: 'WTI 원유' },
  { symbol: 'BTC-USD', label: '비트코인' },
];

@Injectable()
export class MarketService {
  async getOverview() {
    const results = await Promise.allSettled(
      MARKET_SYMBOLS.map(async ({ symbol, label }) => {
        const quote = await yf.quote(symbol);
        return {
          symbol,
          label,
          price: quote.regularMarketPrice,
          change: quote.regularMarketChange,
          changePercent: quote.regularMarketChangePercent,
          currency: quote.currency,
        };
      }),
    );

    return results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<any>).value);
  }
}
