import type { PrismaClient } from '@prisma/client';
import type { Short } from '../domain/types';
import type { ShortsRepository } from './types';

export function createShortsRepository(prisma: PrismaClient): ShortsRepository {
  return {
    async upsertShort(short: Short): Promise<void> {
      await prisma.short.upsert({
        where: { videoId: short.videoId },
        create: {
          videoId: short.videoId,
          channelId: short.channelId,
          title: short.title,
          publishedAt: short.publishedAt,
          crawledAt: short.crawledAt,
        },
        update: {},
      });
    },

    async findActiveShorts(since: Date): Promise<Short[]> {
      const rows = await prisma.short.findMany({
        where: { publishedAt: { gte: since } },
        orderBy: { publishedAt: 'desc' },
      });
      return rows.map((row) => ({
        videoId: row.videoId,
        channelId: row.channelId,
        title: row.title,
        publishedAt: row.publishedAt,
        crawledAt: row.crawledAt,
      }));
    },

    async getLastCrawledAt(): Promise<Date | null> {
      const result = await prisma.short.aggregate({
        _max: { crawledAt: true },
      });
      return result._max.crawledAt;
    },
  };
}
