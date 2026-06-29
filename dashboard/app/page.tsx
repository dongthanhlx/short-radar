'use client'

import { useEffect, useState } from 'react'
import { SearchFilter } from '@/components/SearchFilter'
import { ShortsList, ShortRow } from '@/components/ShortsList'

export default function HomePage() {
  const [shorts, setShorts] = useState<ShortRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [timeWindow, setTimeWindow] = useState('24h')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/shorts?window=${timeWindow}`)
      .then((r) => r.json())
      .then((data: ShortRow[]) => {
        setShorts(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [timeWindow])

  const lastUpdated = shorts
    .flatMap((s) => (s.lastUpdated ? [s.lastUpdated] : []))
    .sort()
    .at(-1)

  const minsAgo = lastUpdated
    ? Math.round((Date.now() - new Date(lastUpdated).getTime()) / 60_000)
    : null

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">short-radar</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            YouTube Shorts velocity tracker
          </p>
        </div>
        {minsAgo !== null && (
          <p className="text-xs text-gray-400">
            Last updated {minsAgo} min ago
          </p>
        )}
      </div>

      <div className="mb-4">
        <SearchFilter
          search={search}
          onSearchChange={setSearch}
          timeWindow={timeWindow}
          onWindowChange={setTimeWindow}
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : (
        <ShortsList shorts={shorts} search={search} />
      )}
    </main>
  )
}
