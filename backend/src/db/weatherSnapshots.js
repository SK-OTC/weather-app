import { supabase } from './index.js';

export async function createSnapshot({ weather_request_id, snapshot_date, temp_min, temp_max, description, raw_api_payload }) {
  const { data, error } = await supabase
    .from('weather_snapshots')
    .insert([{
      weather_request_id: Number(weather_request_id),
      snapshot_date,
      temp_min: temp_min ?? null,
      temp_max: temp_max ?? null,
      description: description ?? null,
      raw_api_payload,
    }])
    .select();
  
  if (error) throw error;
  return data[0] || null;
}

export async function deleteSnapshotsByRequestId(weather_request_id) {
  const { error } = await supabase
    .from('weather_snapshots')
    .delete()
    .eq('weather_request_id', Number(weather_request_id));
  
  if (error) throw error;
}

export async function deleteSnapshot(id) {
  const { error } = await supabase
    .from('weather_snapshots')
    .delete()
    .eq('id', Number(id));
  
  if (error) throw error;
}

export async function updateSnapshot(id, { temp_min, temp_max, description }) {
  const updates = {};
  
  if (temp_min !== undefined) updates.temp_min = temp_min ?? null;
  if (temp_max !== undefined) updates.temp_max = temp_max ?? null;
  if (description !== undefined) updates.description = description ?? null;

  if (Object.keys(updates).length === 0) return null;

  const { data, error } = await supabase
    .from('weather_snapshots')
    .update(updates)
    .eq('id', Number(id))
    .select();
  
  if (error) throw error;
  return data[0] || null;
}

export async function getSnapshotsByRequestId(weather_request_id) {
  const { data, error } = await supabase
    .from('weather_snapshots')
    .select('*')
    .eq('weather_request_id', Number(weather_request_id))
    .order('snapshot_date', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function insertSnapshots(snapshots) {
  if (!snapshots.length) return;
  
  const { error } = await supabase
    .from('weather_snapshots')
    .insert(snapshots.map(s => ({
      weather_request_id: Number(s.weather_request_id),
      snapshot_date: s.snapshot_date,
      temp_min: s.temp_min ?? null,
      temp_max: s.temp_max ?? null,
      description: s.description ?? null,
      raw_api_payload: s.raw_api_payload,
    })));
  
  if (error) throw error;
}
