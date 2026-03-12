import { Controller, Get, Param, Query } from '@nestjs/common';
import { StocksService } from './stocks.service';

@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get('quote/:symbol')
  getQuote(@Param('symbol') symbol: string) {
    return this.stocksService.getQuote(symbol.toUpperCase());
  }

  @Get('chart/:symbol')
  getChart(
    @Param('symbol') symbol: string,
    @Query('interval') interval: '1m' | '5m' | '1h' | '1d' | '1mo' = '1d',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.stocksService.getChart(symbol.toUpperCase(), interval, from, to);
  }

  @Get('news/:symbol')
  getNews(
    @Param('symbol') symbol: string,
    @Query('translate') translate: string,
  ) {
    return this.stocksService.getNews(symbol.toUpperCase(), translate === 'true');
  }

  @Get('price-at/:symbol')
  getPriceAt(
    @Param('symbol') symbol: string,
    @Query('date') date: string,
  ) {
    return this.stocksService.getPriceAt(symbol.toUpperCase(), date);
  }

  @Get('search')
  search(@Query('q') query: string) {
    return this.stocksService.search(query);
  }
}
