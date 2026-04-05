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
  { url: 'https://feeds.apnews.com/apnews/business', source: 'AP News' },
  { url: 'https://www.investing.com/rss/news_25.rss', source: 'Investing.com' },
  { url: 'https://finance.yahoo.com/rss/topstories', source: 'Yahoo Finance' },
];

const ITEMS_PER_FEED = 20;
const FETCH_TIMEOUT_MS = 5_000;
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface GlobalNewsItem {
  title: string;
  link: string;
  publisher: string;
  publishedAt: string;
  source: string;
}

@Injectable()
export class NewsService {
  private rawCache: { items: GlobalNewsItem[]; at: number } | null = null;

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

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), ms),
      ),
    ]);
  }

  private async fetchRaw(): Promise<GlobalNewsItem[]> {
    const results = await Promise.allSettled(
      FEEDS.map((feed) =>
        this.withTimeout(rssParser.parseURL(feed.url), FETCH_TIMEOUT_MS),
      ),
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

    return items;
  }

  async getGlobalNews(translate: boolean): Promise<GlobalNewsItem[]> {
    const now = Date.now();
    let items: GlobalNewsItem[];

    if (this.rawCache && now - this.rawCache.at < CACHE_TTL_MS) {
      items = this.rawCache.items;
    } else {
      items = await this.fetchRaw();
      if (items.length > 0) {
        this.rawCache = { items, at: now };
      } else if (this.rawCache) {
        // 전부 실패 시 만료된 캐시라도 반환
        items = this.rawCache.items;
      }
    }

    if (!translate) return items;

    return Promise.all(
      items.map(async (item) => ({
        ...item,
        title: await this.translateText(item.title),
      })),
    );
  }
}
