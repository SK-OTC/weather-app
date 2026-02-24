import * as locationsDb from '../db/locations.js';
import * as weatherService from './weatherService.js';

/**
 * Resolve user input to a location row (reuse existing or create).
 * Returns location record with id, raw_input, normalized_name, country_code, lat, lon, etc.
 */
export async function resolveAndPersistLocation(locationInput, locationType = 'city') {
  const resolved = await weatherService.geocodeLocation(locationInput, locationType);
  const raw_input = String(locationInput || '').trim();
  const normalized_name = resolved.normalizedName || raw_input;
  const country_code = resolved.countryCode || '';
  const lat = Number(resolved.lat);
  const lon = Number(resolved.lon);

  const existing = await findExistingLocation(normalized_name, country_code, lat, lon);
  if (existing) return existing;

  return locationsDb.createLocation({
    raw_input,
    normalized_name,
    country_code,
    lat,
    lon,
    source: 'openweather',
  });
}

async function findExistingLocation(normalizedName, countryCode, lat, lon) {
  const { query } = await import('../db/index.js');
  const result = await query(
    `SELECT * FROM locations
     WHERE normalized_name = $1 AND country_code = $2
       AND ABS(lat - $3) < 0.01 AND ABS(lon - $4) < 0.01
     LIMIT 1`,
    [normalizedName, countryCode, lat, lon]
  );
  return result.rows[0] || null;
}
