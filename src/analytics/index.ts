import type { MetricsSnapshot, Velocity } from '../domain/types';

export function calculateVelocity(snapshots: MetricsSnapshot[]): Velocity {
  if (snapshots.length < 2) {
    throw new Error('calculateVelocity requires at least 2 MetricsSnapshots');
  }

  const sorted = [...snapshots].sort(
    (a, b) => a.capturedAt.getTime() - b.capturedAt.getTime(),
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const hoursElapsed =
    (last.capturedAt.getTime() - first.capturedAt.getTime()) / (1000 * 60 * 60);

  return {
    videoId: first.videoId,
    windowStart: first.capturedAt,
    windowEnd: last.capturedAt,
    viewsPerHour: (last.viewCount - first.viewCount) / hoursElapsed,
    likesPerHour: (last.likeCount - first.likeCount) / hoursElapsed,
  };
}
