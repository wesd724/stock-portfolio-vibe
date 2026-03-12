import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import type { TransactionDto } from './portfolio.service';

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  // 나중에 auth 미들웨어로 userId를 자동 추출할 예정
  // 현재는 query param으로 받음 (기본값: 'guest')
  @Get('transactions')
  getTransactions(@Query('userId') userId = 'guest') {
    return this.portfolioService.getTransactions(userId);
  }

  @Post('transactions')
  addTransaction(
    @Query('userId') userId = 'guest',
    @Body() tx: TransactionDto,
  ) {
    return this.portfolioService.addTransaction(userId, tx);
  }

  @Delete('transactions/:id')
  removeTransaction(
    @Param('id') id: string,
    @Query('userId') userId = 'guest',
  ) {
    this.portfolioService.removeTransaction(userId, id);
    return { success: true };
  }
}
