import { Controller, Get, Query } from '@nestjs/common';
import { NewsService } from './news.service';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get('global')
  getGlobalNews(@Query('translate') translate: string) {
    return this.newsService.getGlobalNews(translate === 'true');
  }
}
