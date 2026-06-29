import type { YouTubeAdapter } from '../adapters/youtube';
import type { ShortsRepository, MetricsRepository } from '../db/types';

const TRACKING_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface TrackingResult {
  tracked: number;
  errors: number;
}

export interface Tracker {
  runTracking(): Promise<TrackingResult>;
}

export function createTracker(deps: {
  adapter: YouTubeAdapter;
  shortsRepo: ShortsRepository;
  metricsRepo: MetricsRepository;
}): Tracker {
  return {
    async runTracking(): Promise<TrackingResult> {
      const since = new Date(Date.now() - TRACKING_WINDOW_MS);
      const activeShorts = await deps.shortsRepo.findActiveShorts(since);

      if (activeShorts.length === 0) {
        return { tracked: 0, errors: 0 };
      }

      const videoIds = activeShorts.map((s) => s.videoId);
      const snapshots = await deps.adapter.fetchMetrics(videoIds);

      for (const snapshot of snapshots) {
        await deps.metricsRepo.upsertSnapshot(snapshot);
      }

      return { tracked: snapshots.length, errors: 0 };
    },
  };
}
