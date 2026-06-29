import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateVelocity, MetricsSnapshot } from '@/lib/velocity'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const short = await prisma.short.findUnique({
    where: { videoId: params.id },
    include: {
      snapshots: {
        orderBy: { capturedAt: 'asc' },
      },
    },
  })

  if (!short) {
    return NextResponse.json({ error: 'Short not found' }, { status: 404 })
  }

  const snaps: MetricsSnapshot[] = short.snapshots.map((s) => ({
    videoId: short.videoId,
    capturedAt: s.capturedAt,
    viewCount: s.viewCount,
    likeCount: s.likeCount,
    commentCount: s.commentCount,
  }))

  let velocity = null
  if (snaps.length >= 2) {
    try {
      velocity = calculateVelocity(snaps)
    } catch {
      // not enough temporal spread
    }
  }

  return NextResponse.json({
    videoId: short.videoId,
    title: short.title,
    channelId: short.channelId,
    publishedAt: short.publishedAt,
    snapshots: short.snapshots,
    velocity,
  })
}
