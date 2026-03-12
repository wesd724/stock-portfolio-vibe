import { Injectable } from '@nestjs/common';
import Parser from 'rss-parser';

const rssParser = new Parser();

const FEEDS = [
  { url: 'https://feeds.reuters.com/reuters/businessNews', source: 'Reuters' },
  { url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html', source: 'CNBC' },
  {
    url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en',
    source: 'Google News',
  },
];

const ITEMS_PER_FEED = 20;

export interface GlobalNewsItem {
  title: string;
  link: string;
  publisher: string;
  publishedAt: string;
  source: string;
}

@Injectable()
export class NewsService {
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

  async getGlobalNews(translate: boolean): Promise<GlobalNewsItem[]> {
    const results = await Promise.allSettled(
      FEEDS.map((feed) => rssParser.parseURL(feed.url)),
    );

    const items: GlobalNewsItem[] = [];

    results.forEach((result, i) => {
      if (result.status !== 'fulfilled') return;
      result.value.items.slice(0, ITEMS_PER_FEED).forEach((item) => {
        items.push({
          title: item.title ?? '',
          link: item.link ?? '',
          publisher: FEEDS[i].source,
          publishedAt: item.pubDate ?? '',
          source: FEEDS[i].source,
        });
      });
    });

    items.sort((a, b) => {
      const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return db - da;
    });

    if (!translate) return items;

    return Promise.all(
      items.map(async (item) => ({
        ...item,
        title: await this.translateText(item.title),
      })),
    );
  }
}
