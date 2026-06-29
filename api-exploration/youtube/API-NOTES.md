# YouTube Data API v3 — API Notes

Source: https://developers.google.com/youtube/v3/docs
Status: Phase A (from docs) — Phase D will add "Reality vs Docs" section

---

## Auth
- Method: API Key (no OAuth needed — public read-only data)
- Pass as query param: `?key={YOUTUBE_API_KEY}`
- Get key: Google Cloud Console → Enable "YouTube Data API v3"

---

## Endpoint 1: search.list — Discover new Shorts

**Purpose:** Find YouTube Shorts published recently (short-radar crawl cycle)
**Quota cost:** 100 units per call (expensive — use sparingly)

### Request
```
GET https://www.googleapis.com/youtube/v3/search
```

| Param | Location | Type | Required | Default | Notes |
|---|---|---|---|---|---|
| `part` | query | string | YES | — | Use `snippet` (includes title, channelId, publishedAt) |
| `type` | query | string | YES | — | Must be `video` to get videos only |
| `videoDuration` | query | string | NO | `any` | Use `short` (< 4 min) — NOT exclusively Shorts, see Caveat below |
| `order` | query | string | NO | `relevance` | Use `date` to get newest first |
| `publishedAfter` | query | string | NO | — | ISO 8601 (e.g. `2024-01-15T10:00:00Z`) — for incremental crawl |
| `q` | query | string | NO | — | Keyword filter. Optional for short-radar unless filtering by topic |
| `maxResults` | query | integer | NO | `5` | 1–50. Use `50` to maximize quota efficiency |
| `pageToken` | query | string | NO | — | Pagination token from previous response |
| `key` | query | string | YES | — | API key |

### Response shape
```json
{
  "kind": "youtube#searchListResponse",
  "etag": "string",
  "nextPageToken": "string",
  "prevPageToken": "string",
  "pageInfo": {
    "totalResults": 1000000,
    "resultsPerPage": 50
  },
  "items": [
    {
      "kind": "youtube#searchResult",
      "etag": "string",
      "id": {
        "kind": "youtube#video",
        "videoId": "dQw4w9WgXcQ"
      },
      "snippet": {
        "publishedAt": "2024-01-15T10:30:00Z",
        "channelId": "UCxxxxxxxxxxxxxxxx",
        "title": "My Short Video #Shorts",
        "description": "...",
        "thumbnails": { "default": {}, "medium": {}, "high": {} },
        "channelTitle": "Channel Name",
        "liveBroadcastContent": "none"
      }
    }
  ]
}
```

### Fields short-radar needs from search.list
- `items[].id.videoId` → Short.videoId
- `items[].snippet.channelId` → Short.channelId
- `items[].snippet.title` → Short.title
- `items[].snippet.publishedAt` → Short.publishedAt
- `nextPageToken` → for pagination if needed

### CAVEAT: videoDuration=short is NOT exclusively YouTube Shorts
`videoDuration=short` filters videos < 4 minutes. YouTube Shorts (vertical short-form)
can be up to 3 minutes but the filter catches all videos under 4 min including:
- Regular horizontal videos < 4 min
- YouTube Shorts (vertical, share URL = youtube.com/shorts/{videoId})

**Approach for MVP:**
Option A (simpler): Accept all videoDuration=short results, treat them as Shorts
Option B (stricter): After search.list, call videos.list with `part=snippet` and check
  if `snippet.tags` contains "shorts" or title/description has `#shorts` / `#short`

Decision: Start with Option A. Document as ADR-002 trigger if false positive > 20%.

---

## Endpoint 2: videos.list — Fetch Metrics for tracked Shorts

**Purpose:** Poll viewCount, likeCount, commentCount for active Shorts
**Quota cost:** 1 unit per call, regardless of how many videoIds in batch (max 50 per call)

### Request
```
GET https://www.googleapis.com/youtube/v3/videos
```

| Param | Location | Type | Required | Default | Notes |
|---|---|---|---|---|---|
| `part` | query | string | YES | — | Use `statistics` for metrics. Add `snippet` only if needed (same quota cost) |
| `id` | query | string | YES | — | Comma-separated videoIds. Max 50 per call. MUST batch. |
| `key` | query | string | YES | — | API key |

### Response shape
```json
{
  "kind": "youtube#videoListResponse",
  "etag": "string",
  "pageInfo": {
    "totalResults": 2,
    "resultsPerPage": 50
  },
  "items": [
    {
      "kind": "youtube#video",
      "etag": "string",
      "id": "dQw4w9WgXcQ",
      "statistics": {
        "viewCount": "12345",
        "likeCount": "678",
        "commentCount": "90",
        "favoriteCount": "0"
      }
    }
  ]
}
```

### CRITICAL: statistics fields are STRINGS, not numbers
All counts come as `"12345"` (string). Adapter MUST parse to number.
```typescript
// WRONG — will produce NaN in arithmetic
snapshot.viewCount = item.statistics.viewCount

// CORRECT
snapshot.viewCount = parseInt(item.statistics.viewCount, 10)
```

### CRITICAL: likeCount and commentCount can be ABSENT
- `likeCount` is absent if creator disabled like count visibility
- `commentCount` is absent if creator disabled comments
- Adapter MUST handle missing fields with default 0

### favoriteCount
Always `"0"` — deprecated YouTube feature. Ignore in adapter.

### Fields short-radar needs from videos.list
- `items[].id` → videoId (to match back to Short)
- `items[].statistics.viewCount` → MetricsSnapshot.viewCount (parse to int)
- `items[].statistics.likeCount` → MetricsSnapshot.likeCount (parse to int, default 0)
- `items[].statistics.commentCount` → MetricsSnapshot.commentCount (parse to int, default 0)

---

## Error codes

| Code | Meaning | short-radar action |
|---|---|---|
| 400 | Bad request (invalid param) | Log ERROR + alert — fix in code |
| 403 | Quota exceeded OR invalid API key | Log ERROR, stop cycle, do NOT retry |
| 404 | Video not found (deleted/private) | Remove Short from active tracking |
| 429 | Too many requests (rate limit) | Log WARN, back off, respect Retry-After |

---

## Quota details

- Daily limit: 10,000 units (resets at midnight Pacific Time, UTC-7/UTC-8)
- search.list: 100 units/call
- videos.list: 1 unit/call (batch 50 = same 1 unit as batch 1)

### Budget calculation for short-radar
| Job | Frequency | Cost/call | Calls/day | Units/day |
|---|---|---|---|---|
| Crawler (search.list) | every 30 min | 100 | 48 | 4,800 |
| Tracker (videos.list) | every 1h, batch 50 | 1 | ≤ 96* | ≤ 96 |
| **Total** | | | | **≤ 4,896** |

*96 = 200 active Shorts / 50 per batch × 24 polls/day
Buffer: ~5,100 units/day (51% of daily quota)

---

## Incremental crawl strategy (publishedAfter)

To avoid re-fetching already-seen Shorts each crawl cycle:
```
publishedAfter = last successful crawl timestamp - 5min buffer
```
Store `lastCrawledAt` in DB. On first run, use `NOW() - 2h` as bootstrap.

---

## Questions to verify in Phase C (real API calls)

1. Does `videoDuration=short` return actual YouTube Shorts at all? Or does it miss some?
2. Is `likeCount` truly absent (field missing) or null when hidden?
3. Are there additional fields in statistics response not in docs?
4. What does a 403 quota-exceeded response look like exactly?
5. Does `publishedAfter` behave correctly for incremental crawling?
6. Are there undocumented fields in `snippet` that help identify true Shorts?

---

## Reality vs Docs (Phase D — filled 2026-06-29)

| Finding | Expected (docs) | Reality | Impact |
|---|---|---|---|
| `statistics` fields type | strings (docs say so) | ✅ Confirmed strings: `"viewCount": "20"` | Adapter MUST parseInt — never assume number |
| `favoriteCount` | always "0" | ✅ Confirmed `"favoriteCount": "0"` | Ignore in adapter, do not map to domain type |
| `snippet.publishTime` | Not in docs | ⚠️ Field exists, identical to `publishedAt` | Ignore — use `publishedAt` as canonical source |
| `regionCode` in search response | Not in docs | ⚠️ `"regionCode": "VN"` present | Ignore in adapter — determined by API key IP |
| `likeCount` when hidden | Field absent | ❓ Cannot confirm — test videos have 0 likes (not hidden). Need fixture with hidden likes. | Adapter defaults to 0 if field absent: `?? '0'` |
| `maxResults: 50` → actual results | Should return up to 50 | ⚠️ Only 2 returned (`totalResults: 2`). May reflect real availability at crawl time, not API bug. | Normal — Crawler handles 0–50 results per call |
| `pageInfo.resultsPerPage` in videos.list | Not prominent in docs | ⚠️ `"resultsPerPage": 2` matches actual count, not the requested batch size | Ignore — do not use as batch size indicator |

### Additional findings (smoke test 2026-06-29)
| Finding | Impact |
|---|---|
| `search.list` with no `q` param returns `totalResults: 0` always | `SHORTS_QUERY` env var is REQUIRED — must not be empty |
| `SHORTS_QUERY=#shorts` in `.env` — dotenv parses `#` as comment → empty string | Must quote in `.env`: `SHORTS_QUERY="#shorts"` |

### Missing fixtures (still needed before adapter is production-ready)
- `youtube-metrics-hidden-likes.json` — video with creator-hidden likeCount → verify field is absent, not `"0"`
- `youtube-search-minimal.json` — 0 results (empty items array) → verify adapter handles gracefully
- `youtube-metrics-error-403.json` — quota exceeded response → verify error shape for error handler
