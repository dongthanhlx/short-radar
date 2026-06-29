import 'dotenv/config';
import { getPrisma, disconnectPrisma } from './db/connection';
import { createShortsRepository } from './db/shorts-repository';
import { createMetricsRepository } from './db/metrics-repository';
import { createYouTubeAdapter } from './adapters/youtube';
import { createCrawler } from './crawler';
import { createTracker } from './tracker';
import { createScheduler } from './scheduler';

async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is required');
  const shortsQuery = process.env.SHORTS_QUERY;
  if (!shortsQuery) throw new Error('SHORTS_QUERY is required — must be quoted in .env: SHORTS_QUERY="#shorts"');

  const prisma = getPrisma();
  const shortsRepo = createShortsRepository(prisma);
  const metricsRepo = createMetricsRepository(prisma);
  const adapter = createYouTubeAdapter(apiKey);

  const crawler = createCrawler({ adapter, shortsRepo });
  const tracker = createTracker({ adapter, shortsRepo, metricsRepo });

  const scheduler = createScheduler({
    crawler,
    tracker,
    crawlerCron: process.env.CRAWLER_CRON ?? '*/30 * * * *',
    trackerCron: process.env.TRACKER_CRON ?? '0 * * * *',
    shortsQuery,
  });

  scheduler.start();
  console.info('[short-radar] started');

  process.on('SIGTERM', async () => {
    scheduler.stop();
    await disconnectPrisma();
    console.info('[short-radar] stopped');
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[short-radar] fatal', err);
  process.exit(1);
});
