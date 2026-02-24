import { query } from './index.js';

export async function createSnapshot({ weather_request_id, snapshot_date, temp_min, temp_max, description, raw_api_payload }) {
  const result = await query(
    `INSERT INTO weather_snapshots (weather_request_id, snapshot_date, temp_min, temp_max, description, raw_api_payload)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [weather_request_id, snapshot_date, temp_min ?? null, temp_max ?? null, description ?? null, raw_api_payload ? JSON.stringify(raw_api_payload) : null]
  );
  return result.rows[0];
}

export async function deleteSnapshotsByRequestId(weather_request_id) {
  await query('DELETE FROM weather_snapshots WHERE weather_request_id = $1', [weather_request_id]);
}

export async function deleteSnapshot(id) {
  await query('DELETE FROM weather_snapshots WHERE id = $1', [id]);
}

export async function updateSnapshot(id, { temp_min, temp_max, description }) {
  const updates = [];
  const params = [];
  let i = 1;
  
  if (temp_min !== undefined) {
    updates.push(`temp_min = $${i++}`);
    params.push(temp_min ?? null);
  }
  if (temp_max !== undefined) {
    updates.push(`temp_max = $${i++}`);
    params.push(temp_max ?? null);
  }
  if (description !== undefined) {
    updates.push(`description = $${i++}`);
    params.push(description ?? null);
  }
  
  if (updates.length === 0) return null;
  
  params.push(id);
  const result = await query(
    `UPDATE weather_snapshots SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  return result.rows[0] || null;
}

export async function getSnapshotsByRequestId(weather_request_id) {
  const result = await query(
    'SELECT * FROM weather_snapshots WHERE weather_request_id = $1 ORDER BY snapshot_date',
    [weather_request_id]
  );
  return result.rows;
}

export async function insertSnapshots(snapshots) {
  if (!snapshots.length) return;
  const values = snapshots.map((s, i) => {
    const j = i * 6;
    return `($${j + 1}, $${j + 2}, $${j + 3}, $${j + 4}, $${j + 5}, $${j + 6})`;
  }).join(', ');
  const params = snapshots.flatMap(s => [
    s.weather_request_id,
    s.snapshot_date,
    s.temp_min ?? null,
    s.temp_max ?? null,
    s.description ?? null,
    s.raw_api_payload ? JSON.stringify(s.raw_api_payload) : null,
  ]);
  await query(
    `INSERT INTO weather_snapshots (weather_request_id, snapshot_date, temp_min, temp_max, description, raw_api_payload) VALUES ${values}`,
    params
  );
}
