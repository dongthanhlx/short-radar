CREATE TABLE IF NOT EXISTS shorts (
  video_id      TEXT        PRIMARY KEY,
  channel_id    TEXT        NOT NULL,
  title         TEXT        NOT NULL,
  published_at  TIMESTAMPTZ NOT NULL,
  crawled_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS shorts_published_at_idx ON shorts (published_at DESC);

CREATE TABLE IF NOT EXISTS metrics_snapshots (
  id            SERIAL      PRIMARY KEY,
  video_id      TEXT        NOT NULL REFERENCES shorts(video_id),
  captured_at   TIMESTAMPTZ NOT NULL,
  view_count    BIGINT      NOT NULL,
  like_count    BIGINT      NOT NULL,
  comment_count BIGINT      NOT NULL,
  UNIQUE (video_id, captured_at)
);

CREATE INDEX IF NOT EXISTS metrics_snapshots_lookup_idx
  ON metrics_snapshots (video_id, captured_at);
