import { supabase } from './index.js';

export async function createLocation({ raw_input, normalized_name, country_code, lat, lon, source = 'openweather' }) {
  const { data, error } = await supabase
    .from('locations')
    .insert([{
      raw_input,
      normalized_name,
      country_code,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      source,
    }])
    .select();
  
  if (error) throw error;
  return data[0] || null;
}

export async function getLocationById(id) {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('id', Number(id))
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
  return data || null;
}

export async function getLocationByCoordinates(lat, lon) {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('lat', parseFloat(lat))
    .eq('lon', parseFloat(lon))
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}
