import type { PrismaClient } from '@prisma/client';
import type { MetricsSnapshot } from '../domain/types';
import type { MetricsRepository } from './types';

export function createMetricsRepository(prisma: PrismaClient): MetricsRepository {
  return {
    async upsertSnapshot(snapshot: MetricsSnapshot): Promise<void> {
      await prisma.metricsSnapshot.upsert({
        where: {
          videoId_capturedAt: {
            videoId: snapshot.videoId,
            capturedAt: snapshot.capturedAt,
          },
        },
        create: {
          videoId: snapshot.videoId,
          capturedAt: snapshot.capturedAt,
          viewCount: snapshot.viewCount,
          likeCount: snapshot.likeCount,
          commentCount: snapshot.commentCount,
        },
        update: {},
      });
    },

    async findSnapshots(videoId: string): Promise<MetricsSnapshot[]> {
      const rows = await prisma.metricsSnapshot.findMany({
        where: { videoId },
        orderBy: { capturedAt: 'asc' },
      });
      return rows.map((row) => ({
        videoId: row.videoId,
        capturedAt: row.capturedAt,
        viewCount: row.viewCount,
        likeCount: row.likeCount,
        commentCount: row.commentCount,
      }));
    },
  };
}
