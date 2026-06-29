import cron, { type ScheduledTask } from 'node-cron';
import type { Crawler } from '../crawler';
import type { Tracker } from '../tracker';

export interface Scheduler {
  start(): void;
  stop(): void;
}

export function createScheduler(deps: {
  crawler: Crawler;
  tracker: Tracker;
  crawlerCron: string;
  trackerCron: string;
  shortsQuery: string;
}): Scheduler {
  const tasks: ScheduledTask[] = [];

  return {
    start() {
      tasks.push(
        cron.schedule(deps.crawlerCron, async () => {
          const result = await deps.crawler.runCrawl({
            query: deps.shortsQuery,
          });
          console.info(`[crawler] discovered=${result.discovered}`);
        }),
      );

      tasks.push(
        cron.schedule(deps.trackerCron, async () => {
          const result = await deps.tracker.runTracking();
          console.info(`[tracker] tracked=${result.tracked}`);
        }),
      );
    },

    stop() {
      tasks.forEach((t) => t.stop());
      tasks.length = 0;
    },
  };
}
