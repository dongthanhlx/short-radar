/**
 * One-shot smoke test: run one crawl + one tracking cycle, print results.
 * Usage: ts-node src/smoke-test.ts
 * Delete this file after L1 is confirmed working.
 */
import 'dotenv/config';
import { getPrisma, disconnectPrisma } from './db/connection';
import { createShortsRepository } from './db/shorts-repository';
import { createMetricsRepository } from './db/metrics-repository';
import { createYouTubeAdapter } from './adapters/youtube';
import { createCrawler } from './crawler';
import { createTracker } from './tracker';

async function run() {
  const apiKey = process.env.YOUTUBE_API_KEY!;
  const prisma = getPrisma();
  const shortsRepo = createShortsRepository(prisma);
  const metricsRepo = createMetricsRepository(prisma);
  const adapter = createYouTubeAdapter(apiKey);
  const crawler = createCrawler({ adapter, shortsRepo });
  const tracker = createTracker({ adapter, shortsRepo, metricsRepo });

  console.log('--- CRAWL ---');
  const crawlResult = await crawler.runCrawl({
    query: process.env.SHORTS_QUERY,
  });
  console.log(`discovered: ${crawlResult.discovered}`);

  console.log('\n--- TRACK ---');
  const trackResult = await tracker.runTracking();
  console.log(`tracked: ${trackResult.tracked}`);

  console.log('\n--- SHORTS IN DB ---');
  const activeShorts = await shortsRepo.findActiveShorts(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
  );
  activeShorts.slice(0, 3).forEach((s) => {
    console.log(`  ${s.videoId} | ${s.title.slice(0, 50)}`);
  });

  console.log('\n--- SNAPSHOTS IN DB ---');
  if (activeShorts[0]) {
    const snapshots = await metricsRepo.findSnapshots(activeShorts[0].videoId);
    snapshots.forEach((s) => {
      console.log(`  ${s.capturedAt.toISOString()} | views=${s.viewCount}`);
    });
  }

  await disconnectPrisma();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
