import { query } from './index.js';

export async function createLocation({ raw_input, normalized_name, country_code, lat, lon, source = 'openweather' }) {
  const result = await query(
    `INSERT INTO locations (raw_input, normalized_name, country_code, lat, lon, source)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [raw_input, normalized_name, country_code, lat, lon, source]
  );
  return result.rows[0];
}

export async function getLocationById(id) {
  const result = await query('SELECT * FROM locations WHERE id = $1', [id]);
  return result.rows[0] || null;
}
