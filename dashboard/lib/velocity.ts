// Duplicated from src/analytics/index.ts
// TODO[shared-lib]: extract to packages/domain when both processes need it
export interface MetricsSnapshot {
  videoId: string
  capturedAt: Date
  viewCount: number
  likeCount: number
  commentCount: number
}

export interface Velocity {
  videoId: string
  windowStart: Date
  windowEnd: Date
  viewsPerHour: number
  likesPerHour: number
}

export function calculateVelocity(snapshots: MetricsSnapshot[]): Velocity {
  if (snapshots.length < 2) {
    throw new Error(
      `Need at least 2 snapshots to calculate velocity, got ${snapshots.length}`
    )
  }

  const sorted = [...snapshots].sort(
    (a, b) => a.capturedAt.getTime() - b.capturedAt.getTime()
  )

  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const hours =
    (last.capturedAt.getTime() - first.capturedAt.getTime()) / (1000 * 60 * 60)

  if (hours === 0) {
    throw new Error('All snapshots have the same timestamp')
  }

  return {
    videoId: first.videoId,
    windowStart: first.capturedAt,
    windowEnd: last.capturedAt,
    viewsPerHour: Math.round((last.viewCount - first.viewCount) / hours),
    likesPerHour: Math.round((last.likeCount - first.likeCount) / hours),
  }
}
