import { supabase } from './index.js';

export async function createRequest({ location_id, requested_start_date, requested_end_date, temperature_unit = 'C', current_temp, current_feels_like, notes }) {
  const { data, error } = await supabase
    .from('weather_requests')
    .insert([{
      location_id,
      requested_start_date,
      requested_end_date,
      temperature_unit,
      current_temp: current_temp ?? null,
      current_feels_like: current_feels_like ?? null,
      notes: notes ?? null,
    }])
    .select();
  
  if (error) throw error;
  return data[0] || null;
}

export async function listRequests({ limit = 50, offset = 0, locationName, startDate, endDate } = {}) {
  let query = supabase
    .from('weather_requests')
    .select(`
      *,
      locations(raw_input, normalized_name, country_code, lat, lon)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (locationName) {
    query = query.or(`locations.normalized_name.ilike.%${locationName}%,locations.raw_input.ilike.%${locationName}%`);
  }
  if (startDate) {
    query = query.gte('requested_end_date', startDate);
  }
  if (endDate) {
    query = query.lte('requested_start_date', endDate);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  
  // Flatten location data for backwards compatibility
  return data.map(wr => ({
    ...wr,
    raw_input: wr.locations?.raw_input,
    normalized_name: wr.locations?.normalized_name,
    country_code: wr.locations?.country_code,
    lat: wr.locations?.lat,
    lon: wr.locations?.lon,
  }));
}

export async function getRequestById(id) {
  const { data, error } = await supabase
    .from('weather_requests')
    .select(`
      *,
      locations(raw_input, normalized_name, country_code, lat, lon)
    `)
    .eq('id', Number(id))
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
  if (!data) return null;
  
  // Flatten location data
  return {
    ...data,
    raw_input: data.locations?.raw_input,
    normalized_name: data.locations?.normalized_name,
    country_code: data.locations?.country_code,
    lat: data.locations?.lat,
    lon: data.locations?.lon,
  };
}

export async function updateRequest(id, { requested_start_date, requested_end_date, temperature_unit, current_temp, current_feels_like, notes }) {
  const updates = {};
  
  if (requested_start_date !== undefined) updates.requested_start_date = requested_start_date;
  if (requested_end_date !== undefined) updates.requested_end_date = requested_end_date;
  if (temperature_unit !== undefined) updates.temperature_unit = temperature_unit;
  if (current_temp !== undefined) updates.current_temp = current_temp ?? null;
  if (current_feels_like !== undefined) updates.current_feels_like = current_feels_like ?? null;
  if (notes !== undefined) updates.notes = notes;
  
  if (Object.keys(updates).length === 0) return getRequestById(id);
  
  updates.updated_at = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('weather_requests')
    .update(updates)
    .eq('id', Number(id))
    .select();
  
  if (error) throw error;
  return data[0] || null;
}

export async function deleteRequest(id) {
  const { error } = await supabase
    .from('weather_requests')
    .delete()
    .eq('id', Number(id));
  
  if (error) throw error;
}
