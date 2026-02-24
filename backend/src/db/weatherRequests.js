import { query } from './index.js';

export async function createRequest({ location_id, requested_start_date, requested_end_date, temperature_unit = 'C', current_temp, current_feels_like, notes }) {
  const result = await query(
    `INSERT INTO weather_requests (location_id, requested_start_date, requested_end_date, temperature_unit, current_temp, current_feels_like, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [location_id, requested_start_date, requested_end_date, temperature_unit, current_temp ?? null, current_feels_like ?? null, notes ?? null]
  );
  return result.rows[0];
}

export async function listRequests({ limit = 50, offset = 0, locationName, startDate, endDate } = {}) {
  let sql = `
    SELECT wr.*, l.raw_input, l.normalized_name, l.country_code, l.lat, l.lon
    FROM weather_requests wr
    JOIN locations l ON wr.location_id = l.id
    WHERE 1=1
  `;
  const params = [];
  let i = 1;
  if (locationName) {
    sql += ` AND (l.normalized_name ILIKE $${i} OR l.raw_input ILIKE $${i})`;
    params.push(`%${locationName}%`);
    i++;
  }
  if (startDate) {
    sql += ` AND wr.requested_end_date >= $${i}`;
    params.push(startDate);
    i++;
  }
  if (endDate) {
    sql += ` AND wr.requested_start_date <= $${i}`;
    params.push(endDate);
    i++;
  }
  sql += ` ORDER BY wr.created_at DESC LIMIT $${i} OFFSET $${i + 1}`;
  params.push(limit, offset);
  const result = await query(sql, params);
  return result.rows;
}

export async function getRequestById(id) {
  const result = await query(
    `SELECT wr.*, l.raw_input, l.normalized_name, l.country_code, l.lat, l.lon
     FROM weather_requests wr
     JOIN locations l ON wr.location_id = l.id
     WHERE wr.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function updateRequest(id, { requested_start_date, requested_end_date, temperature_unit, current_temp, current_feels_like, notes }) {
  const updates = [];
  const params = [];
  let i = 1;
  if (requested_start_date !== undefined) {
    updates.push(`requested_start_date = $${i++}`);
    params.push(requested_start_date);
  }
  if (requested_end_date !== undefined) {
    updates.push(`requested_end_date = $${i++}`);
    params.push(requested_end_date);
  }
  if (temperature_unit !== undefined) {
    updates.push(`temperature_unit = $${i++}`);
    params.push(temperature_unit);
  }
  if (current_temp !== undefined) {
    updates.push(`current_temp = $${i++}`);
    params.push(current_temp ?? null);
  }
  if (current_feels_like !== undefined) {
    updates.push(`current_feels_like = $${i++}`);
    params.push(current_feels_like ?? null);
  }
  if (notes !== undefined) {
    updates.push(`notes = $${i++}`);
    params.push(notes);
  }
  if (updates.length === 0) return getRequestById(id);
  updates.push(`updated_at = NOW()`);
  params.push(id);
  const result = await query(
    `UPDATE weather_requests SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  return result.rows[0] || null;
}

export async function deleteRequest(id) {
  await query('DELETE FROM weather_requests WHERE id = $1', [id]);
}
