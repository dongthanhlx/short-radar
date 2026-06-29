import type { Short, MetricsSnapshot } from '../../domain/types';
import { YouTubeClient, YouTubeQuotaExceededError } from './youtube-client';
import { normalizeShort, normalizeMetricsSnapshot } from './normalizer';

export { YouTubeQuotaExceededError };

export interface YouTubeAdapter {
  searchShorts(params: { query?: string; publishedAfter?: Date }): Promise<Short[]>;
  fetchMetrics(videoIds: string[]): Promise<MetricsSnapshot[]>;
  get quotaRemaining(): number;
}

export function createYouTubeAdapter(apiKey: string): YouTubeAdapter {
  const client = new YouTubeClient(apiKey);

  return {
    async searchShorts(params) {
      const response = await client.searchShorts({ ...params, maxResults: 50 });
      const crawledAt = new Date();
      return response.items.map((item) => normalizeShort(item, crawledAt));
    },

    async fetchMetrics(videoIds) {
      const chunks = chunkArray(videoIds, 50);
      const capturedAt = new Date();
      const snapshots: MetricsSnapshot[] = [];

      for (const chunk of chunks) {
        const response = await client.fetchVideoMetrics(chunk);
        for (const item of response.items) {
          snapshots.push(normalizeMetricsSnapshot(item, capturedAt));
        }
      }

      return snapshots;
    },

    get quotaRemaining() {
      return client.quotaRemaining;
    },
  };
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
