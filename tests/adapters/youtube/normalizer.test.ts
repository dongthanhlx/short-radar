import { normalizeShort, normalizeMetricsSnapshot } from '../../../src/adapters/youtube/normalizer';
import searchFixture from '../../fixtures/youtube-search-success.json';
import metricsFixture from '../../fixtures/youtube-metrics-success.json';
import type { YouTubeSearchItem, YouTubeVideoItem } from '../../../src/adapters/youtube/raw-types';

const CRAWLED_AT = new Date('2026-06-29T10:00:00Z');
const CAPTURED_AT = new Date('2026-06-29T11:00:00Z');

describe('normalizeShort', () => {
  const rawItem = searchFixture.items[0] as YouTubeSearchItem;

  it('maps videoId from id.videoId', () => {
    const short = normalizeShort(rawItem, CRAWLED_AT);
    expect(short.videoId).toBe('uTUA8zO90vM');
  });

  it('maps channelId from snippet.channelId', () => {
    const short = normalizeShort(rawItem, CRAWLED_AT);
    expect(short.channelId).toBe('UC-liG37GD6swtdH9NN8_6OQ');
  });

  it('maps title from snippet.title', () => {
    const short = normalizeShort(rawItem, CRAWLED_AT);
    expect(short.title).toBe(
      '*NEW* FOOTBALL EVENT + ADMIN ABUSE #3 in Fortnite Steal The Brainrot!',
    );
  });

  it('parses publishedAt as Date', () => {
    const short = normalizeShort(rawItem, CRAWLED_AT);
    expect(short.publishedAt).toEqual(new Date('2026-06-29T04:00:11Z'));
  });

  it('sets crawledAt from param', () => {
    const short = normalizeShort(rawItem, CRAWLED_AT);
    expect(short.crawledAt).toBe(CRAWLED_AT);
  });
});

describe('normalizeMetricsSnapshot', () => {
  const rawItem = metricsFixture.items[0] as YouTubeVideoItem;

  it('maps videoId from item.id', () => {
    const snapshot = normalizeMetricsSnapshot(rawItem, CAPTURED_AT);
    expect(snapshot.videoId).toBe('uTUA8zO90vM');
  });

  it('parses viewCount string to number', () => {
    const snapshot = normalizeMetricsSnapshot(rawItem, CAPTURED_AT);
    expect(snapshot.viewCount).toBe(20);
    expect(typeof snapshot.viewCount).toBe('number');
  });

  it('parses likeCount string to number', () => {
    const snapshot = normalizeMetricsSnapshot(rawItem, CAPTURED_AT);
    expect(snapshot.likeCount).toBe(0);
    expect(typeof snapshot.likeCount).toBe('number');
  });

  it('parses commentCount string to number', () => {
    const snapshot = normalizeMetricsSnapshot(rawItem, CAPTURED_AT);
    expect(snapshot.commentCount).toBe(0);
    expect(typeof snapshot.commentCount).toBe('number');
  });

  it('sets capturedAt from param', () => {
    const snapshot = normalizeMetricsSnapshot(rawItem, CAPTURED_AT);
    expect(snapshot.capturedAt).toBe(CAPTURED_AT);
  });

  it('defaults viewCount to 0 when field is absent', () => {
    const itemWithoutViews = {
      ...rawItem,
      statistics: {},
    } as YouTubeVideoItem;
    const snapshot = normalizeMetricsSnapshot(itemWithoutViews, CAPTURED_AT);
    expect(snapshot.viewCount).toBe(0);
    expect(snapshot.likeCount).toBe(0);
    expect(snapshot.commentCount).toBe(0);
  });

  it('defaults likeCount to 0 when creator hides likes', () => {
    const itemHiddenLikes = {
      ...rawItem,
      statistics: { viewCount: '5000', commentCount: '10' },
    } as YouTubeVideoItem;
    const snapshot = normalizeMetricsSnapshot(itemHiddenLikes, CAPTURED_AT);
    expect(snapshot.likeCount).toBe(0);
    expect(snapshot.viewCount).toBe(5000);
  });

  it('does not expose favoriteCount', () => {
    const snapshot = normalizeMetricsSnapshot(rawItem, CAPTURED_AT);
    expect(snapshot).not.toHaveProperty('favoriteCount');
  });
});
