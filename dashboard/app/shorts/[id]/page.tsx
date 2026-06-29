import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { MetricsChart, SnapshotPoint } from '@/components/MetricsChart'
import { calculateVelocity, MetricsSnapshot } from '@/lib/velocity'

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export default async function ShortDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const short = await prisma.short.findUnique({
    where: { videoId: params.id },
    include: {
      snapshots: { orderBy: { capturedAt: 'asc' } },
    },
  })

  if (!short) notFound()

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

  const latest = snaps[snaps.length - 1]
  const chartPoints: SnapshotPoint[] = short.snapshots.map((s) => ({
    capturedAt: s.capturedAt.toISOString(),
    viewCount: s.viewCount,
    likeCount: s.likeCount,
  }))

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-flex items-center gap-1"
      >
        ← Back
      </Link>

      <div className="flex gap-4 mt-4 mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://i.ytimg.com/vi/${short.videoId}/mqdefault.jpg`}
          alt=""
          width={160}
          height={90}
          className="rounded-lg object-cover shrink-0"
        />
        <div>
          <h1 className="text-xl font-bold text-gray-900">{short.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Published{' '}
            {new Date(short.publishedAt).toLocaleString([], {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
          <a
            href={`https://youtube.com/shorts/${short.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-600 hover:underline mt-1 inline-block"
          >
            Open on YouTube ↗
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        <StatCard
          label="Views"
          value={latest ? fmt(latest.viewCount) : '—'}
        />
        <StatCard
          label="Likes"
          value={latest ? fmt(latest.likeCount) : '—'}
        />
        <StatCard
          label="Views/h"
          value={velocity ? `+${fmt(velocity.viewsPerHour)}` : '—'}
          accent="indigo"
        />
        <StatCard
          label="Likes/h"
          value={velocity ? `+${fmt(velocity.likesPerHour)}` : '—'}
          accent="pink"
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Metrics over time · {short.snapshots.length} snapshots
        </h2>
        <MetricsChart snapshots={chartPoints} />
      </div>
    </main>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'indigo' | 'pink'
}) {
  const valueClass =
    accent === 'indigo'
      ? 'text-indigo-600'
      : accent === 'pink'
      ? 'text-pink-600'
      : 'text-gray-900'

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold font-mono ${valueClass}`}>{value}</p>
    </div>
  )
}
