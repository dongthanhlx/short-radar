import { createCrawler } from '../../src/crawler';
import type { YouTubeAdapter } from '../../src/adapters/youtube';
import type { ShortsRepository } from '../../src/db/types';

const LAST_CRAWLED_AT = new Date('2026-06-29T05:00:00Z');

function makeMocks(lastCrawledAt: Date | null) {
  const adapter: Pick<YouTubeAdapter, 'searchShorts'> = {
    searchShorts: jest.fn().mockResolvedValue([]),
  };
  const repo: Pick<ShortsRepository, 'upsertShort' | 'getLastCrawledAt'> = {
    upsertShort: jest.fn().mockResolvedValue(undefined),
    getLastCrawledAt: jest.fn().mockResolvedValue(lastCrawledAt),
  };
  return { adapter, repo };
}

describe('Crawler incremental crawl', () => {
  it('passes publishedAfter = lastCrawledAt minus 5-min buffer', async () => {
    const { adapter, repo } = makeMocks(LAST_CRAWLED_AT);
    const crawler = createCrawler({
      adapter: adapter as YouTubeAdapter,
      shortsRepo: repo as ShortsRepository,
    });

    await crawler.runCrawl({ query: '#shorts' });

    const calledWith = (adapter.searchShorts as jest.Mock).mock.calls[0][0];
    const expectedAfter = new Date(LAST_CRAWLED_AT.getTime() - 5 * 60 * 1000);
    expect(calledWith.publishedAfter).toEqual(expectedAfter);
  });

  it('bootstraps with 2h window on first run (no previous crawl)', async () => {
    const { adapter, repo } = makeMocks(null);
    const crawler = createCrawler({
      adapter: adapter as YouTubeAdapter,
      shortsRepo: repo as ShortsRepository,
    });

    const before = new Date();
    await crawler.runCrawl({ query: '#shorts' });

    const calledWith = (adapter.searchShorts as jest.Mock).mock.calls[0][0];
    const expectedAfter = new Date(before.getTime() - 2 * 60 * 60 * 1000);
    // Allow 1s tolerance
    expect(calledWith.publishedAfter.getTime()).toBeGreaterThanOrEqual(
      expectedAfter.getTime() - 1000,
    );
    expect(calledWith.publishedAfter.getTime()).toBeLessThanOrEqual(
      expectedAfter.getTime() + 1000,
    );
  });

  it('uses caller-provided publishedAfter when explicitly set', async () => {
    const { adapter, repo } = makeMocks(LAST_CRAWLED_AT);
    const crawler = createCrawler({
      adapter: adapter as YouTubeAdapter,
      shortsRepo: repo as ShortsRepository,
    });

    const explicit = new Date('2026-06-29T01:00:00Z');
    await crawler.runCrawl({ query: '#shorts', publishedAfter: explicit });

    const calledWith = (adapter.searchShorts as jest.Mock).mock.calls[0][0];
    expect(calledWith.publishedAfter).toEqual(explicit);
    expect(repo.getLastCrawledAt).not.toHaveBeenCalled();
  });
});
