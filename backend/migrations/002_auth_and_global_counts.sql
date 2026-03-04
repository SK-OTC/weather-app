ALTER TABLE weather_requests
  ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE weather_requests
  ADD COLUMN IF NOT EXISTS searched_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_weather_requests_user ON weather_requests(user_id);

CREATE TABLE IF NOT EXISTS global_search_counts (
  location_id INTEGER PRIMARY KEY REFERENCES locations(id) ON DELETE CASCADE,
  search_count BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_global_search_counts_search_count
  ON global_search_counts(search_count DESC);

CREATE OR REPLACE FUNCTION increment_location_search(p_location_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO global_search_counts (location_id, search_count, updated_at)
  VALUES (p_location_id, 1, NOW())
  ON CONFLICT (location_id)
  DO UPDATE SET
    search_count = global_search_counts.search_count + 1,
    updated_at = NOW();
END;
$$;
