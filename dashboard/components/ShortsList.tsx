'use client'

import Link from 'next/link'

export interface ShortRow {
  videoId: string
  title: string
  channelId: string
  publishedAt: string
  latestViewCount: number
  viewsPerHour: number
  likesPerHour: number
  snapshotCount: number
  lastUpdated: string | null
}

interface ShortsListProps {
  shorts: ShortRow[]
  search: string
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function age(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (h < 1) return '<1h ago'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function ShortsList({ shorts, search }: ShortsListProps) {
  const filtered = search
    ? shorts.filter((s) =>
        s.title.toLowerCase().includes(search.toLowerCase())
      )
    : shorts

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        {search ? 'No results match your search.' : 'No Shorts crawled yet.'}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-500 w-24">
              Thumbnail
            </th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Title</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
              Published
            </th>
            <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
              Views
            </th>
            <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
              Views/h
            </th>
            <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
              Likes/h
            </th>
            <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
              Snaps
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {filtered.map((short) => (
            <tr key={short.videoId} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://i.ytimg.com/vi/${short.videoId}/mqdefault.jpg`}
                  alt=""
                  width={80}
                  height={45}
                  className="rounded object-cover"
                />
              </td>
              <td className="px-4 py-3 max-w-xs">
                <Link
                  href={`/shorts/${short.videoId}`}
                  className="text-indigo-600 hover:underline line-clamp-2 font-medium"
                >
                  {short.title}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                {age(short.publishedAt)}
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {fmt(short.latestViewCount)}
              </td>
              <td className="px-4 py-3 text-right font-mono font-semibold text-indigo-600">
                {short.viewsPerHour > 0 ? `+${fmt(short.viewsPerHour)}` : '—'}
              </td>
              <td className="px-4 py-3 text-right font-mono text-pink-600">
                {short.likesPerHour > 0 ? `+${fmt(short.likesPerHour)}` : '—'}
              </td>
              <td className="px-4 py-3 text-right text-gray-400">
                {short.snapshotCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
