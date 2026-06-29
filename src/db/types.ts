import type { Short, MetricsSnapshot } from '../domain/types';

export interface ShortsRepository {
  upsertShort(short: Short): Promise<void>;
  findActiveShorts(since: Date): Promise<Short[]>;
  getLastCrawledAt(): Promise<Date | null>;
}

export interface MetricsRepository {
  upsertSnapshot(snapshot: MetricsSnapshot): Promise<void>;
  findSnapshots(videoId: string): Promise<MetricsSnapshot[]>;
}
