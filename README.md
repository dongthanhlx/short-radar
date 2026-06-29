# short-radar

Crawls the latest YouTube Shorts every 30 minutes, tracks metrics for 24 hours after publish, and calculates velocity to evaluate the growth rate of each Short.

## How it works

```
[Cron: 30min]          [Cron: 1h]
     │                      │
  Crawler               Tracker
  search.list           videos.list (batch 50)
     │                      │
     └──────── PostgreSQL ───┘         ←── Dashboard (port 3000)
               shorts                       velocity ranking
               metrics_snapshots            metrics charts
```

- **Crawler** — calls `search.list`, saves new Shorts to DB. Automatically computes `publishedAfter` from the last crawl timestamp (incremental).
- **Tracker** — each cycle, fetches all Shorts within the 24h TrackingWindow, batch-calls `videos.list`, saves `MetricsSnapshot`.
- **Analytics** — calculates `Velocity` (views/hour, likes/hour) from any two snapshots.

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL
- YouTube Data API v3 key

### Install

```bash
npm install
```

### Environment

```bash
cp .env.example .env
# Fill in YOUTUBE_API_KEY and DATABASE_URL
```

```env
YOUTUBE_API_KEY=your_api_key_here
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/short_radar
CRAWLER_CRON=*/30 * * * *
TRACKER_CRON=0 * * * *
SHORTS_QUERY="#shorts"
MAX_RESULTS_PER_CRAWL=50
```

> **Note:** `SHORTS_QUERY` must be quoted in `.env` because `#` is treated as a comment character.
> Correct: `SHORTS_QUERY="#shorts"` — Wrong: `SHORTS_QUERY=#shorts`

### Database

```bash
# Create database
psql -U postgres -c "CREATE DATABASE short_radar;"

# Run migrations
npm run db:migrate
```

### Run

```bash
# Terminal 1 — scheduler (crawler + tracker on cron)
npm start

# Terminal 2 — dashboard
cd dashboard
cp .env.example .env   # fill in DATABASE_URL (same as root .env)
npm install
npm run dev
# Open http://localhost:3000

# Optional: browse raw data
npm run db:studio
```

## Scripts

### Scheduler (root)

| Script | Description |
|---|---|
| `npm start` | Start the scheduler |
| `npm test` | Run 22 unit tests |
| `npm run db:migrate` | Run Prisma migration |
| `npm run db:studio` | Open Prisma Studio |
| `npm run build` | Compile TypeScript |

### Dashboard (`cd dashboard`)

| Script | Description |
|---|---|
| `npm run dev` | Start dashboard at http://localhost:3000 |
| `npm run build` | Build for production |
| `npm start` | Run production build |

## YouTube API quota

Default budget with 10,000 units/day free tier:

| Job | Frequency | Cost/call | Units/day |
|---|---|---|---|
| Crawler (`search.list`) | 30 min | 100 | 4,800 |
| Tracker (`videos.list`, batch 50) | 1 hour | 1 | ≤ 96 |
| **Total** | | | **≤ 4,896** |

## Querying velocity

```sql
-- View snapshots for a specific Short
SELECT captured_at, view_count, like_count
FROM metrics_snapshots
WHERE video_id = 'VIDEO_ID'
ORDER BY captured_at;

-- Top Shorts by view growth in the last 24 hours
SELECT
  s.video_id,
  s.title,
  MAX(m.view_count) - MIN(m.view_count) AS view_growth
FROM shorts s
JOIN metrics_snapshots m ON s.video_id = m.video_id
WHERE s.published_at >= NOW() - INTERVAL '24 hours'
GROUP BY s.video_id, s.title
ORDER BY view_growth DESC
LIMIT 10;
```

## Project structure

```
src/
  adapters/youtube/   YouTube Data API v3 adapter (normalizer, client, quota tracking)
  crawler/            Discover new Shorts via search.list
  tracker/            Poll metrics for active Shorts via videos.list
  analytics/          Calculate Velocity from MetricsSnapshots (pure functions)
  scheduler/          node-cron orchestration
  db/                 Prisma repositories (ShortsRepository, MetricsRepository)
  domain/             Domain types: Short, MetricsSnapshot, Velocity

dashboard/            Next.js 14 dashboard (separate process, port 3000)
  app/                Pages and API routes (App Router)
  components/         ShortsList, MetricsChart, SearchFilter
  lib/                Prisma client (read-only), velocity calculation

prisma/
  schema.prisma       Database schema
  migrations/         Migration history

api-exploration/
  youtube/            API-NOTES.md, Bruno collection, real API fixtures
```
