import { supabase } from './index.js';

export async function incrementLocationSearch(locationId) {
  const numericId = Number(locationId);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error('Invalid location id for global search increment');
  }

  const { error } = await supabase.rpc('increment_location_search', {
    p_location_id: numericId,
  });

  if (error) throw error;
}

export async function listGlobalSearchCounts({ limit = 20 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const { data, error } = await supabase
    .from('global_search_counts')
    .select(`
      location_id,
      search_count,
      updated_at,
      locations(normalized_name, raw_input, country_code)
    `)
    .order('search_count', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(safeLimit);

  if (error) throw error;

  return (data || []).map((row) => ({
    location_id: row.location_id,
    search_count: row.search_count,
    updated_at: row.updated_at,
    normalized_name: row.locations?.normalized_name,
    raw_input: row.locations?.raw_input,
    country_code: row.locations?.country_code,
  }));
}
