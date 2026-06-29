'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export interface SnapshotPoint {
  capturedAt: string
  viewCount: number
  likeCount: number
}

interface MetricsChartProps {
  snapshots: SnapshotPoint[]
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function MetricsChart({ snapshots }: MetricsChartProps) {
  if (snapshots.length < 2) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
        Need at least 2 snapshots to show chart (have {snapshots.length})
      </div>
    )
  }

  const data = snapshots.map((s) => ({
    time: fmtTime(s.capturedAt),
    viewCount: s.viewCount,
    likeCount: s.likeCount,
  }))

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Views over time</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtNum} tick={{ fontSize: 11 }} width={48} />
            <Tooltip formatter={(v: number) => [fmtNum(v), 'Views']} />
            <Line
              type="monotone"
              dataKey="viewCount"
              stroke="#4f46e5"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Likes over time</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtNum} tick={{ fontSize: 11 }} width={48} />
            <Tooltip formatter={(v: number) => [fmtNum(v), 'Likes']} />
            <Line
              type="monotone"
              dataKey="likeCount"
              stroke="#db2777"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
