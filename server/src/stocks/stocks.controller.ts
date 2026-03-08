import { Controller, Get, Param, Query } from '@nestjs/common';
import { StocksService } from './stocks.service';

@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get('quote/:symbol')
  getQuote(@Param('symbol') symbol: string) {
    return this.stocksService.getQuote(symbol.toUpperCase());
  }

  @Get('search')
  search(@Query('q') query: string) {
    return this.stocksService.search(query);
  }
}
