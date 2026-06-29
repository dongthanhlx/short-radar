# ARCHITECTURE.md — short-radar (MVP)

## Core flow

```
[CRON: every 30min]          [CRON: every hour]
       │                            │
  ┌────▼──────┐              ┌──────▼──────┐
  │  Crawler  │              │   Tracker   │
  │           │              │             │
  │ search    │              │ find active │
  │ .list     │              │ Shorts      │
  │ (YouTube) │              │ (24h window)│
  └────┬──────┘              └──────┬──────┘
       │                            │
       │ upsert Short               │ batch videos.list (50/call)
       │                            │ upsert MetricsSnapshot
       ▼                            ▼
  ┌─────────────────────────────────────────┐
  │              PostgreSQL DB              │
  │   shorts          metrics_snapshots     │
  └─────────────────────────────────────────┘

YouTube API v3 ──► adapters/youtube/ ──► domain types (Short, MetricsSnapshot)
Raw response never exits the adapter layer.
```

## Modules

### `scheduler/`
Job: Trigger crawler and tracker on their respective cron schedules. Nothing else.
Public interface: `start(): void`, `stop(): void`
Depends on: `crawler`, `tracker`
Must NOT: contain business logic, import `db/` or `adapters/`

### `crawler/`
Job: Discover new Shorts via YouTube search.list, persist Short entities.
Public interface: `runCrawl(): Promise<CrawlResult>`
Depends on: `adapters/youtube`, `db/shorts-repository`
Must NOT: import `tracker/`, call `videos.list`, calculate Velocity

### `tracker/`
Job: Find Shorts still within TrackingWindow (publishedAt > NOW() - 24h), fetch current
metrics in batches of 50, persist MetricsSnapshots.
Public interface: `runTracking(): Promise<TrackingResult>`
Depends on: `adapters/youtube`, `db/shorts-repository`, `db/metrics-repository`
Must NOT: import `crawler/`, call `search.list`

### `analytics/`
Job: Calculate Velocity from MetricsSnapshots. Pure functions, no DB, no API calls.
Public interface: `calculateVelocity(snapshots: MetricsSnapshot[]): Velocity`
Depends on: nothing (pure domain logic)
Must NOT: import DB, import adapters, have side effects

### `adapters/youtube/`
Job: Wrap YouTube Data API v3. Normalize raw responses → domain types. Track quota usage.
Public interface: `searchShorts(query: string): Promise<Short[]>`, `fetchMetrics(videoIds: string[]): Promise<MetricsSnapshot[]>`
Depends on: `axios`, YouTube API key from env
Must NOT: be imported by anything except `crawler/` and `tracker/`
Raw response NEVER exits this module.

### `db/`
Job: Typed repository functions — SQL queries only, returns domain objects.
Public interface:
- `shorts-repository`: `upsertShort(short: Short)`, `findActiveShorts(): Promise<Short[]>`
- `metrics-repository`: `upsertSnapshot(snapshot: MetricsSnapshot)`, `findSnapshots(videoId: string): Promise<MetricsSnapshot[]>`
Depends on: `pg` client
Must NOT: contain business logic, be imported by `adapters/`

## Core domain types

```typescript
// Entity — identity is videoId (YouTube's permanent ID)
interface Short {
  videoId: string;       // YouTube's permanent ID — never changes
  channelId: string;
  title: string;
  publishedAt: Date;     // from YouTube API — start of TrackingWindow
  crawledAt: Date;       // when short-radar first discovered this Short
}

// Value Object — immutable point-in-time capture
// Identity: (videoId, capturedAt) — composite, unique constraint in DB
interface MetricsSnapshot {
  videoId: string;
  capturedAt: Date;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

// Value Object — calculated, never stored
// Requires at least 2 MetricsSnapshots
interface Velocity {
  videoId: string;
  windowStart: Date;
  windowEnd: Date;
  viewsPerHour: number;
  likesPerHour: number;
}
```

## Database schema (MVP)

```sql
CREATE TABLE shorts (
  video_id      TEXT        PRIMARY KEY,   -- YouTube's permanent video ID
  channel_id    TEXT        NOT NULL,
  title         TEXT        NOT NULL,
  published_at  TIMESTAMPTZ NOT NULL,      -- TrackingWindow starts here
  crawled_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup: which Shorts are still in TrackingWindow?
CREATE INDEX shorts_published_at_idx ON shorts (published_at DESC);

CREATE TABLE metrics_snapshots (
  id            SERIAL      PRIMARY KEY,
  video_id      TEXT        NOT NULL REFERENCES shorts(video_id),
  captured_at   TIMESTAMPTZ NOT NULL,
  view_count    BIGINT      NOT NULL,
  like_count    BIGINT      NOT NULL,
  comment_count BIGINT      NOT NULL,
  UNIQUE (video_id, captured_at)            -- idempotent upsert key
);

CREATE INDEX metrics_snapshots_video_id_idx ON metrics_snapshots (video_id, captured_at);
```

## ADR

### ADR-001: Batch videos.list calls (50 per request)
**Decision:** Tracker always batches videoIds in groups of 50 before calling `videos.list`.
**Options rejected:**
- Individual call per Short → 1 unit × N Shorts × 24 polls/day exhausts quota fast (100 Shorts = 2,400 units/day just for tracking)
- Batch size > 50 → YouTube API hard limit is 50 per request
**Consequence:** Tracker must collect all active Short IDs first, then chunk into groups of 50.
**Trigger to revisit:** If YouTube API raises batch limit above 50.

### ADR-002: YouTube search.list as discovery mechanism
**Decision:** Use `search.list?type=video&videoDuration=short` as the MVP discovery method.
**Options rejected:**
- Dedicated Shorts endpoint → does not exist in YouTube Data API v3
- Channel-based discovery → requires knowing which channels to monitor upfront
**Consequence:** `videoDuration=short` returns videos ≤4 min, not exclusively Shorts. Adapter filters by URL pattern (`youtube.com/shorts/`) from video details if needed.
**Trigger to revisit:** If YouTube releases a dedicated Shorts API endpoint, or if false positives (non-Shorts) exceed 20%.
