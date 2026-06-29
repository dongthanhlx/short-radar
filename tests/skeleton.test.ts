import { createCrawler } from '../src/crawler';
import { createTracker } from '../src/tracker';
import { calculateVelocity } from '../src/analytics';
import type { Short, MetricsSnapshot } from '../src/domain/types';
import type { YouTubeAdapter } from '../src/adapters/youtube';
import type { ShortsRepository, MetricsRepository } from '../src/db/types';

const SHORTS: Short[] = [
  {
    videoId: 'uTUA8zO90vM',
    channelId: 'UC-liG37GD6swtdH9NN8_6OQ',
    title: 'Test Short 1',
    publishedAt: new Date('2026-06-29T04:00:00Z'),
    crawledAt: new Date('2026-06-29T04:30:00Z'),
  },
  {
    videoId: 'NYbxo2kPbHQ',
    channelId: 'UC2piRdeDuoExhewsas0xIXg',
    title: 'Test Short 2',
    publishedAt: new Date('2026-06-29T04:00:00Z'),
    crawledAt: new Date('2026-06-29T04:30:00Z'),
  },
];

const SNAPSHOTS: MetricsSnapshot[] = [
  { videoId: 'uTUA8zO90vM', capturedAt: new Date('2026-06-29T05:00:00Z'), viewCount: 100, likeCount: 10, commentCount: 2 },
  { videoId: 'uTUA8zO90vM', capturedAt: new Date('2026-06-29T06:00:00Z'), viewCount: 200, likeCount: 18, commentCount: 5 },
];

describe('Crawler skeleton', () => {
  it('discovers Shorts and persists each one', async () => {
    const mockAdapter: Pick<YouTubeAdapter, 'searchShorts'> = {
      searchShorts: jest.fn().mockResolvedValue(SHORTS),
    };
    const mockRepo: Pick<ShortsRepository, 'upsertShort' | 'getLastCrawledAt'> = {
      upsertShort: jest.fn().mockResolvedValue(undefined),
      getLastCrawledAt: jest.fn().mockResolvedValue(new Date()),
    };

    const crawler = createCrawler({
      adapter: mockAdapter as YouTubeAdapter,
      shortsRepo: mockRepo as ShortsRepository,
    });
    const result = await crawler.runCrawl({ query: '#shorts' });

    expect(result.discovered).toBe(2);
    expect(mockRepo.upsertShort).toHaveBeenCalledTimes(2);
    expect(mockRepo.upsertShort).toHaveBeenCalledWith(SHORTS[0]);
  });

  it('returns 0 discovered when search returns empty', async () => {
    const mockAdapter: Pick<YouTubeAdapter, 'searchShorts'> = {
      searchShorts: jest.fn().mockResolvedValue([]),
    };
    const mockRepo: Pick<ShortsRepository, 'upsertShort' | 'getLastCrawledAt'> = {
      upsertShort: jest.fn(),
      getLastCrawledAt: jest.fn().mockResolvedValue(new Date()),
    };

    const crawler = createCrawler({
      adapter: mockAdapter as YouTubeAdapter,
      shortsRepo: mockRepo as ShortsRepository,
    });
    const result = await crawler.runCrawl({});

    expect(result.discovered).toBe(0);
    expect(mockRepo.upsertShort).not.toHaveBeenCalled();
  });
});

describe('Tracker skeleton', () => {
  it('polls metrics for active Shorts and saves each snapshot', async () => {
    const mockAdapter: Pick<YouTubeAdapter, 'fetchMetrics'> = {
      fetchMetrics: jest.fn().mockResolvedValue(SNAPSHOTS),
    };
    const mockShortsRepo: Pick<ShortsRepository, 'findActiveShorts'> = {
      findActiveShorts: jest.fn().mockResolvedValue(SHORTS),
    };
    const mockMetricsRepo: Pick<MetricsRepository, 'upsertSnapshot'> = {
      upsertSnapshot: jest.fn().mockResolvedValue(undefined),
    };

    const tracker = createTracker({
      adapter: mockAdapter as YouTubeAdapter,
      shortsRepo: mockShortsRepo as ShortsRepository,
      metricsRepo: mockMetricsRepo as MetricsRepository,
    });
    const result = await tracker.runTracking();

    expect(result.tracked).toBe(2);
    expect(mockAdapter.fetchMetrics).toHaveBeenCalledWith(['uTUA8zO90vM', 'NYbxo2kPbHQ']);
    expect(mockMetricsRepo.upsertSnapshot).toHaveBeenCalledTimes(2);
  });

  it('skips polling when no active Shorts in TrackingWindow', async () => {
    const mockAdapter: Pick<YouTubeAdapter, 'fetchMetrics'> = {
      fetchMetrics: jest.fn(),
    };
    const mockShortsRepo: Pick<ShortsRepository, 'findActiveShorts'> = {
      findActiveShorts: jest.fn().mockResolvedValue([]),
    };
    const mockMetricsRepo: Pick<MetricsRepository, 'upsertSnapshot'> = {
      upsertSnapshot: jest.fn(),
    };

    const tracker = createTracker({
      adapter: mockAdapter as YouTubeAdapter,
      shortsRepo: mockShortsRepo as ShortsRepository,
      metricsRepo: mockMetricsRepo as MetricsRepository,
    });
    const result = await tracker.runTracking();

    expect(result.tracked).toBe(0);
    expect(mockAdapter.fetchMetrics).not.toHaveBeenCalled();
  });
});

describe('Analytics skeleton', () => {
  it('calculates viewsPerHour and likesPerHour from two snapshots', () => {
    const velocity = calculateVelocity(SNAPSHOTS);

    expect(velocity.viewsPerHour).toBe(100);
    expect(velocity.likesPerHour).toBe(8);
    expect(velocity.windowStart).toEqual(SNAPSHOTS[0].capturedAt);
    expect(velocity.windowEnd).toEqual(SNAPSHOTS[1].capturedAt);
  });

  it('throws when fewer than 2 snapshots provided', () => {
    expect(() => calculateVelocity([SNAPSHOTS[0]])).toThrow();
  });
});
