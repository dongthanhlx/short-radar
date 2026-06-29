import type { Short, MetricsSnapshot } from '../../domain/types';
import type { YouTubeSearchItem, YouTubeVideoItem } from './raw-types';

export function normalizeShort(item: YouTubeSearchItem, crawledAt: Date): Short {
  return {
    videoId: item.id.videoId,
    channelId: item.snippet.channelId,
    title: item.snippet.title,
    publishedAt: new Date(item.snippet.publishedAt),
    crawledAt,
  };
}

export function normalizeMetricsSnapshot(
  item: YouTubeVideoItem,
  capturedAt: Date,
): MetricsSnapshot {
  const { statistics } = item;
  return {
    videoId: item.id,
    capturedAt,
    // Statistics fields are strings in the API — parseInt required (confirmed Phase C)
    // Fields can be absent when creator hides likes or disables comments — default to 0
    viewCount: parseInt(statistics.viewCount ?? '0', 10),
    likeCount: parseInt(statistics.likeCount ?? '0', 10),
    commentCount: parseInt(statistics.commentCount ?? '0', 10),
  };
}
