import { Injectable, NotFoundException } from '@nestjs/common';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance();

@Injectable()
export class StocksService {
  async getQuote(symbol: string) {
    try {
      const result = await yf.quote(symbol);
      return {
        symbol: result.symbol,
        name: result.longName ?? result.shortName ?? symbol,
        price: result.regularMarketPrice,
        change: result.regularMarketChange,
        changePercent: result.regularMarketChangePercent,
        volume: result.regularMarketVolume,
        marketCap: result.marketCap,
        currency: result.currency,
      };
    } catch {
      throw new NotFoundException(`종목을 찾을 수 없습니다: ${symbol}`);
    }
  }

  async search(query: string) {
    const result = await yf.search(query);
    return result.quotes
      .filter((q) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
      .map((q) => ({
        symbol: q.symbol,
        name: 'longname' in q ? q.longname : ('shortname' in q ? q.shortname : q.symbol),
        exchange: 'exchange' in q ? q.exchange : '',
      }));
  }
}
