'use client'

interface SearchFilterProps {
  search: string
  onSearchChange: (value: string) => void
  timeWindow: string
  onWindowChange: (value: string) => void
}

const WINDOWS = [
  { value: 'all', label: 'All' },
  { value: '24h', label: 'Last 24h' },
  { value: '12h', label: 'Last 12h' },
  { value: '6h', label: 'Last 6h' },
]

export function SearchFilter({
  search,
  onSearchChange,
  timeWindow,
  onWindowChange,
}: SearchFilterProps) {
  return (
    <div className="flex gap-4 items-center flex-wrap">
      <input
        type="text"
        placeholder="Search titles..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <div className="flex gap-1">
        {WINDOWS.map((w) => (
          <button
            key={w.value}
            onClick={() => onWindowChange(w.value)}
            className={`px-3 py-2 text-sm rounded-md transition-colors ${
              timeWindow === w.value
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>
    </div>
  )
}
