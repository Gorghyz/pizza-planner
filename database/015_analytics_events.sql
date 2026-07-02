CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_name TEXT NOT NULL,
  page_path TEXT NOT NULL,
  event_date DATE NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_date
  ON analytics_events (event_date DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name_date
  ON analytics_events (event_name, event_date DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_page_path_date
  ON analytics_events (page_path, event_date DESC);
