import * as locationsDb from '../db/locations.js';
import * as weatherService from './weatherService.js';
import { supabase } from '../lib/supabase.js';

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
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('normalized_name', normalizedName)
    .eq('country_code', countryCode)
    .gte('lat', lat - 0.01)
    .lte('lat', lat + 0.01)
    .gte('lon', lon - 0.01)
    .lte('lon', lon + 0.01)
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data || null;
}
