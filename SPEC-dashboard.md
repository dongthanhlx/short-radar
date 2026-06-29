# SPEC: Dashboard — Display & Evaluate Crawled Shorts

## Problem
No UI to evaluate growth rates. User must query PostgreSQL manually to see Velocity data.

## User journey
User opens dashboard → sees Shorts ranked by velocity → searches/filters → clicks a Short → sees metrics chart over 24h.

## Acceptance criteria
1. **List view** — table of Shorts sorted by `viewsPerHour` DESC
   - Columns: thumbnail, title, channel, publishedAt, latest viewCount, viewsPerHour
   - Search by title (client-side, instant)
   - Filter by TrackingWindow: All | Last 6h | Last 12h | Last 24h
2. **Detail view** — `/shorts/[videoId]`
   - Line chart: viewCount over time (all MetricsSnapshots for that Short)
   - Line chart: likeCount over time
   - Summary: total velocity, peak hour, total growth
3. **Data freshness** — shows "Last updated: X min ago" (based on latest snapshot timestamp)

## Out of scope (MVP)
- Authentication
- Pagination (limit 200 Shorts)
- Real-time auto-refresh (manual reload only)
- Write operations (delete, flag)

## Architecture
```
dashboard/               ← Next.js 14 app (separate process, port 3000)
  app/
    page.tsx             ← list view
    shorts/[id]/page.tsx ← detail view
    api/shorts/route.ts  ← GET /api/shorts (list + velocity)
    api/shorts/[id]/metrics/route.ts  ← GET /api/shorts/[id]/metrics
  components/
    ShortsList.tsx
    MetricsChart.tsx
    SearchFilter.tsx
  lib/
    prisma.ts            ← Prisma client (read-only, same DB)
    velocity.ts          ← calculateVelocity (duplicated from src/ — MVP shortcut)
```

**Boundary rules:**
- `dashboard/` NEVER imports from `src/` (separate module boundary)
- Dashboard is read-only — zero writes to DB
- TODO[shared-lib]: extract `calculateVelocity` to `packages/domain` when dashboard + scheduler both need it

## Tech decisions
- Framework: Next.js 14 (App Router)
- Chart: `recharts`
- Styling: Tailwind CSS
- DB: Prisma (same `prisma/schema.prisma`, same DATABASE_URL)

## Risks
- Velocity requires ≥ 2 snapshots — Shorts with only 1 snapshot show velocity = 0
- `viewsPerHour` can be misleading if TrackingWindow < 1h (too early to judge)
