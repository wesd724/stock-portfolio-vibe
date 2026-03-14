import { Injectable, NotFoundException } from '@nestjs/common';
import YahooFinance from 'yahoo-finance2';
import Parser from 'rss-parser';

const yf = new YahooFinance();
const rssParser = new Parser();

type ChartInterval = '1m' | '5m' | '1h' | '1d' | '1mo';

@Injectable()
export class StocksService {
  async getQuote(symbol: string) {
    try {
      const result = await yf.quote(symbol);
      return {
        symbol: result.symbol,
        name: result.longName ?? result.shortName ?? symbol,
        currency: result.currency,
        marketState: result.marketState,
        // 현재가
        price: result.regularMarketPrice,
        change: result.regularMarketChange,
        changePercent: result.regularMarketChangePercent,
        // 당일
        open: result.regularMarketOpen,
        dayHigh: result.regularMarketDayHigh,
        dayLow: result.regularMarketDayLow,
        volume: result.regularMarketVolume,
        // 시가총액 / 지표
        marketCap: result.marketCap,
        trailingPE: result.trailingPE,
        dividendYield: result.dividendYield,
        // 52주
        fiftyTwoWeekHigh: result.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: result.fiftyTwoWeekLow,
        // 프리/애프터장
        preMarketPrice: result.preMarketPrice,
        preMarketChange: result.preMarketChange,
        preMarketChangePercent: result.preMarketChangePercent,
        postMarketPrice: result.postMarketPrice,
        postMarketChange: result.postMarketChange,
        postMarketChangePercent: result.postMarketChangePercent,
      };
    } catch {
      throw new NotFoundException(`종목을 찾을 수 없습니다: ${symbol}`);
    }
  }

  async getChart(symbol: string, interval: ChartInterval, from?: string, to?: string) {
    let period1: Date;
    let period2: Date | undefined;

    if (from) {
      period1 = new Date(from);
      period2 = to ? new Date(to) : undefined;
    } else {
      const periodMap: Record<ChartInterval, number> = {
        '1m': 1,
        '5m': 5,
        '1h': 30,
        '1d': 365,
        '1mo': 1825,
      };
      period1 = new Date(Date.now() - periodMap[interval] * 24 * 60 * 60 * 1000);
    }

    const result = await yf.chart(symbol, {
      period1,
      ...(period2 && { period2 }),
      interval,
    });

    return result.quotes
      .filter((q) => q.close != null)
      .map((q) => ({
        time: q.date.getTime(),
        close: q.close,
      }));
  }

  private async translateText(text: string): Promise<string> {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      const data = await res.json();
      return data[0].map((item: any) => item[0]).join('');
    } catch {
      return text;
    }
  }

  async getNews(symbol: string, translate: boolean) {
    const [yahooItems, googleItems] = await Promise.allSettled([
      rssParser.parseURL(
        `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${symbol}&region=US&lang=en-US`,
      ),
      rssParser.parseURL(
        `https://news.google.com/rss/search?q=${symbol}+stock&hl=en-US&gl=US&ceid=US:en`,
      ),
    ]);

    const toNews = (items: any[], source: 'yahoo' | 'google') =>
      items.slice(0, 5).map((item) => ({
        title: item.title ?? '',
        link: item.link ?? '',
        publisher: source === 'yahoo' ? (item.source ?? 'Yahoo Finance') : (item.source?.$t ?? 'Google News'),
        publishedAt: item.pubDate ?? '',
        source,
      }));

    const yahoo = yahooItems.status === 'fulfilled' ? toNews(yahooItems.value.items, 'yahoo') : [];
    const google = googleItems.status === 'fulfilled' ? toNews(googleItems.value.items, 'google') : [];
    const all = [...yahoo, ...google];

    if (!translate) return all;

    return Promise.all(
      all.map(async (item) => ({
        ...item,
        title: await this.translateText(item.title),
      })),
    );
  }

  async getPriceAt(symbol: string, date: string) {
    const period1 = new Date(date);
    const period2 = new Date(date);
    period2.setDate(period2.getDate() + 5);

    const result = await yf.chart(symbol, { period1, period2, interval: '1d' });
    const quotes = result.quotes.filter((q) => q.close != null);

    if (quotes.length === 0) {
      throw new NotFoundException(`해당 날짜의 주가 데이터가 없습니다: ${symbol} (${date})`);
    }

    return {
      price: quotes[0].close as number,
      date: quotes[0].date.toISOString().split('T')[0],
      firstTradeDate: result.meta.firstTradeDate
        ? (result.meta.firstTradeDate as Date).toISOString().split('T')[0]
        : null,
    };
  }

  async getScreener(quoteType: string, sort: string, order: string) {
    const TOP_ETFS = [
      'SPY','QQQ','IWM','VTI','EEM','GLD','TLT','XLF','XLE','XLK',
      'XLV','XLU','XLP','XLB','XLI','ARKK','VNQ','AGG','LQD','HYG',
      'VEA','VWO','EFA','EWJ','FXI','GDX','SLV','USO','SMH','SOXX',
      'IBB','XBI','TQQQ','SQQQ','UPRO','SPXL','BND','VXUS','VO','VB',
      'SCHD','JEPI','JEPQ','NVDL','TSLL','MSFO','AMZU','IBIT','GBTC','BITO',
    ];

    const toRow = (q: any) => ({
      symbol: q.symbol,
      name: q.shortName ?? q.longName ?? q.symbol,
      price: q.regularMarketPrice ?? 0,
      change: q.regularMarketChange ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
      volume: q.regularMarketVolume ?? 0,
      avgVolume3M: q.averageDailyVolume3Month ?? 0,
      quoteType: q.quoteType ?? 'EQUITY',
    });

    // 정렬 기준에 따라 적합한 스크리너 선택
    const equityScrId =
      sort === 'changePercent' && order === 'desc' ? 'day_gainers' :
      sort === 'changePercent' && order === 'asc'  ? 'day_losers'  :
      'most_actives';

    const requests: Promise<any[]>[] = [];

    if (quoteType === 'EQUITY' || quoteType === 'ALL') {
      requests.push(
        (yf as any).screener({ scrIds: equityScrId, count: 100 })
          .then((r: any) => r.quotes.filter((q: any) => q.quoteType === 'EQUITY'))
          .catch(() => []),
      );
    }

    if (quoteType === 'ETF' || quoteType === 'ALL') {
      // Yahoo Finance 웹과 동일한 ETF 전용 커스텀 쿼리
      const etfSortField =
        sort === 'changePercent' && order === 'desc' ? 'percentchange' :
        sort === 'changePercent' && order === 'asc'  ? 'percentchange' :
        sort === 'avgVolume3M' ? 'avgdailyvol3m' : 'dayvolume';
      const etfSortType = sort === 'changePercent' && order === 'asc' ? 'ASC' : order === 'asc' ? 'ASC' : 'DESC';

      requests.push(
        (yf as any).screener({
          query: {
            operator: 'and',
            operands: [
              { operator: 'eq', operands: ['region', 'us'] },
              { operator: 'eq', operands: ['quoteType', 'ETF'] },
            ],
          },
          sortField: etfSortField,
          sortType: etfSortType,
          offset: 0,
          count: 100,
        })
          .then((r: any) => r.quotes)
          .catch(() =>
            // 커스텀 쿼리 실패 시 고정 목록 fallback
            yf.quote(TOP_ETFS as any)
              .then((r: any) => (Array.isArray(r) ? r : [r]).filter((q: any) => q.quoteType === 'ETF'))
              .catch(() => []),
          ),
      );
    }

    const results = await Promise.all(requests);
    const combined = results.flat();

    // 중복 제거
    const seen = new Set<string>();
    const unique = combined.filter((q: any) => {
      if (seen.has(q.symbol)) return false;
      seen.add(q.symbol);
      return true;
    });

    const rows = unique.map(toRow);
    const sortKey = sort === 'changePercent' ? 'changePercent' : sort === 'volume' ? 'volume' : 'avgVolume3M';
    rows.sort((a, b) => order === 'desc' ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]);
    return rows;
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

  async getForexRate(date: string): Promise<{ rate: number; date: string }> {
    const period1 = new Date(date);
    const period2 = new Date(date);
    period2.setDate(period2.getDate() + 5);
    const result = await yf.chart('KRW=X', { period1, period2, interval: '1d' });
    const quotes = result.quotes.filter((q) => q.close != null);
    if (quotes.length === 0) throw new NotFoundException(`환율 데이터 없음: ${date}`);
    return { rate: quotes[0].close as number, date: quotes[0].date.toISOString().split('T')[0] };
  }

  async getCurrentForexRate(): Promise<{ rate: number }> {
    const result = await yf.quote('KRW=X');
    return { rate: result.regularMarketPrice ?? 1300 };
  }
}
