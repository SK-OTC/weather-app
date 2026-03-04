-- Weather App Schema
-- locations: normalized location data from user input (city, zip, coords)
CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  raw_input VARCHAR(500) NOT NULL,
  normalized_name VARCHAR(255),
  country_code VARCHAR(10),
  lat DECIMAL(10, 7) NOT NULL,
  lon DECIMAL(10, 7) NOT NULL,
  source VARCHAR(50) DEFAULT 'openweather',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- weather_requests: each user request with location + date range (CRUD unit)
CREATE TABLE IF NOT EXISTS weather_requests (
  id SERIAL PRIMARY KEY,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  user_id UUID,
  requested_start_date DATE NOT NULL,
  requested_end_date DATE NOT NULL,
  temperature_unit VARCHAR(1) DEFAULT 'C' CHECK (temperature_unit IN ('C', 'F')),
  current_temp DECIMAL(5, 2),
  current_feels_like DECIMAL(5, 2),
  notes TEXT,
  searched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (requested_start_date <= requested_end_date)
);

-- weather_snapshots: cached weather data per request (current + forecast points)
CREATE TABLE IF NOT EXISTS weather_snapshots (
  id SERIAL PRIMARY KEY,
  weather_request_id INTEGER NOT NULL REFERENCES weather_requests(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  temp_min DECIMAL(5, 2),
  temp_max DECIMAL(5, 2),
  description VARCHAR(255),
  raw_api_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS global_search_counts (
  location_id INTEGER PRIMARY KEY REFERENCES locations(id) ON DELETE CASCADE,
  search_count BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_weather_requests_location ON weather_requests(location_id);
CREATE INDEX IF NOT EXISTS idx_weather_requests_dates ON weather_requests(requested_start_date, requested_end_date);
CREATE INDEX IF NOT EXISTS idx_weather_requests_user ON weather_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_weather_snapshots_request ON weather_snapshots(weather_request_id);
CREATE INDEX IF NOT EXISTS idx_global_search_counts_search_count ON global_search_counts(search_count DESC);
