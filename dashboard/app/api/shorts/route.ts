import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateVelocity, MetricsSnapshot } from '@/lib/velocity'

const WINDOW_MS: Record<string, number> = {
  '6h': 6 * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  all: 7 * 24 * 60 * 60 * 1000,
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const windowKey = searchParams.get('window') ?? '24h'
  const since = new Date(Date.now() - (WINDOW_MS[windowKey] ?? WINDOW_MS['24h']))

  const shorts = await prisma.short.findMany({
    where: { publishedAt: { gte: since } },
    include: {
      snapshots: {
        orderBy: { capturedAt: 'asc' },
        select: {
          capturedAt: true,
          viewCount: true,
          likeCount: true,
          commentCount: true,
        },
      },
    },
    orderBy: { publishedAt: 'desc' },
    take: 200,
  })

  const rows = shorts.map((short) => {
    const snaps: MetricsSnapshot[] = short.snapshots.map((s) => ({
      videoId: short.videoId,
      capturedAt: s.capturedAt,
      viewCount: s.viewCount,
      likeCount: s.likeCount,
      commentCount: s.commentCount,
    }))

    let viewsPerHour = 0
    let likesPerHour = 0
    if (snaps.length >= 2) {
      try {
        const v = calculateVelocity(snaps)
        viewsPerHour = v.viewsPerHour
        likesPerHour = v.likesPerHour
      } catch {
        // not enough temporal spread
      }
    }

    const latest = snaps[snaps.length - 1]
    return {
      videoId: short.videoId,
      title: short.title,
      channelId: short.channelId,
      publishedAt: short.publishedAt,
      latestViewCount: latest?.viewCount ?? 0,
      viewsPerHour,
      likesPerHour,
      snapshotCount: snaps.length,
      lastUpdated: latest?.capturedAt ?? null,
    }
  })

  rows.sort((a, b) => b.viewsPerHour - a.viewsPerHour)

  return NextResponse.json(rows)
}
