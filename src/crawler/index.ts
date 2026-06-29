import type { YouTubeAdapter } from '../adapters/youtube';
import type { ShortsRepository } from '../db/types';

export interface CrawlParams {
  query?: string;
  publishedAfter?: Date;
}

export interface CrawlResult {
  discovered: number;
  errors: number;
}

export interface Crawler {
  runCrawl(params: CrawlParams): Promise<CrawlResult>;
}

const BUFFER_MS = 5 * 60 * 1000;
const BOOTSTRAP_MS = 2 * 60 * 60 * 1000;

export function createCrawler(deps: {
  adapter: YouTubeAdapter;
  shortsRepo: ShortsRepository;
}): Crawler {
  return {
    async runCrawl(params: CrawlParams): Promise<CrawlResult> {
      const publishedAfter =
        params.publishedAfter ?? (await resolvePublishedAfter(deps.shortsRepo));

      const shorts = await deps.adapter.searchShorts({ ...params, publishedAfter });

      for (const short of shorts) {
        await deps.shortsRepo.upsertShort(short);
      }

      return { discovered: shorts.length, errors: 0 };
    },
  };
}

async function resolvePublishedAfter(repo: ShortsRepository): Promise<Date> {
  const lastCrawledAt = await repo.getLastCrawledAt();
  if (!lastCrawledAt) return new Date(Date.now() - BOOTSTRAP_MS);
  return new Date(lastCrawledAt.getTime() - BUFFER_MS);
}
