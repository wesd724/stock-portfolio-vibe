import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { StocksModule } from './stocks/stocks.module';
import { MarketModule } from './market/market.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { NewsModule } from './news/news.module';

@Module({
  imports: [DatabaseModule, StocksModule, MarketModule, PortfolioModule, NewsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
