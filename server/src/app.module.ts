import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { StocksModule } from './stocks/stocks.module';
import { MarketModule } from './market/market.module';
import { PortfolioModule } from './portfolio/portfolio.module';

@Module({
  imports: [DatabaseModule, StocksModule, MarketModule, PortfolioModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
