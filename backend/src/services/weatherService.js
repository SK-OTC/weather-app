import axios from 'axios';
import { locationNotFoundError, upstreamError } from '../lib/errors.js';

const BASE = 'https://api.openweathermap.org';
const API_KEY = process.env.OPENWEATHER_API_KEY;

function getKey() {
  if (!API_KEY) throw upstreamError('Weather API is not configured (missing OPENWEATHER_API_KEY).');
  return API_KEY;
}

/**
 * Resolve user input to a single location: { normalizedName, countryCode, lat, lon }.
 * Supports: city name, zip+country, coordinates "lat,lon".
 */
export async function geocodeLocation(locationInput, locationType = 'city') {
  const key = getKey();
  const trimmed = String(locationInput || '').trim();
  if (!trimmed) throw new Error('Location input is required');

  // Coordinates: "lat,lon" or "lat, lon"
  if (locationType === 'coords') {
    const parts = trimmed.split(/[\s,]+/).map(p => parseFloat(p.trim()));
    if (parts.length < 2 || parts.some(isNaN)) throw new Error('Invalid coordinates. Use format: latitude, longitude');
    const [lat, lon] = parts;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) throw new Error('Coordinates out of range');
    const reverse = await reverseGeocode(lat, lon, key);
    return reverse;
  }

  // Zip/postal code: "zip" or "zip,countryCode"
  if (locationType === 'zip') {
    const [zip, country] = trimmed.split(/[\s,]+/).map(s => s.trim());
    if (!zip) throw new Error('Postal code is required');
    // OpenWeather expects zip parameter in format "zip,country" (e.g., "10001,US")
    const zipParam = country ? `${zip},${country.slice(0, 2).toUpperCase()}` : zip;
    const res = await axios.get(`${BASE}/geo/1.0/zip`, {
      params: { zip: zipParam, appid: key },
      timeout: 10000,
    }).catch(handleAxiosError);
    const data = res.data;
    if (!data || data.lat == null) throw locationNotFoundError('No location found for this postal code.');
    return {
      normalizedName: data.name || trimmed,
      countryCode: data.country || '',
      lat: data.lat,
      lon: data.lon,
    };
  }

  // city or other free text → direct geocoding
  const limit = 5;
  const res = await axios.get(`${BASE}/geo/1.0/direct`, {
    params: { q: trimmed, limit, appid: key },
    timeout: 10000,
  }).catch(handleAxiosError);
  const list = Array.isArray(res.data) ? res.data : [];
  if (list.length === 0) throw locationNotFoundError(`No location found for "${trimmed}".`);
  const first = list[0];
  return {
    normalizedName: first.name || trimmed,
    countryCode: first.country || '',
    lat: first.lat,
    lon: first.lon,
  };
}

async function reverseGeocode(lat, lon, key) {
  const res = await axios.get(`${BASE}/geo/1.0/reverse`, {
    params: { lat, lon, limit: 1, appid: key },
    timeout: 10000,
  }).catch(handleAxiosError);
  const list = Array.isArray(res.data) ? res.data : [];
  const first = list[0];
  return {
    normalizedName: first?.name || `${lat}, ${lon}`,
    countryCode: first?.country || '',
    lat: Number(lat),
    lon: Number(lon),
  };
}

function handleAxiosError(err) {
  if (err.response?.status === 404) throw locationNotFoundError('Location not found.');
  if (err.code === 'ECONNABORTED' || err.response?.status >= 500) throw upstreamError('Weather service temporarily unavailable.');
  if (err.response?.data?.message) throw upstreamError(err.response.data.message);
  throw upstreamError('Could not resolve location.');
}

/**
 * Get current weather and 5-day forecast for lat/lon.
 * units: 'metric' (C) or 'imperial' (F)
 */
export async function getCurrentAndForecast({ lat, lon, units = 'metric' }) {
  const key = getKey();
  const params = { lat, lon, appid: key, units };

  const [currentRes, forecastRes] = await Promise.all([
    axios.get(`${BASE}/data/2.5/weather`, { params, timeout: 10000 }),
    axios.get(`${BASE}/data/2.5/forecast`, { params, timeout: 10000 }),
  ]).catch((err) => {
    if (err.response?.status === 404) throw locationNotFoundError('Location not found.');
    if (err.code === 'ECONNABORTED' || err.response?.status >= 500) throw upstreamError('Weather service temporarily unavailable.');
    throw upstreamError(err.response?.data?.message || 'Failed to fetch weather.');
  });

  const current = normalizeCurrent(currentRes.data);
  const forecast = normalizeForecast(forecastRes.data);
  return { current, forecast };
}

function normalizeCurrent(data) {
  if (!data?.main) return null;
  return {
    temp: data.main.temp,
    feels_like: data.main.feels_like,
    temp_min: data.main.temp_min,
    temp_max: data.main.temp_max,
    humidity: data.main.humidity,
    pressure: data.main.pressure,
    description: data.weather?.[0]?.description || '',
    icon: data.weather?.[0]?.icon || '',
    wind_speed: data.wind?.speed,
    wind_deg: data.wind?.deg,
    clouds: data.clouds?.all,
    sunrise: data.sys?.sunrise,
    sunset: data.sys?.sunset,
  };
}

/** Group 3h forecast by date and return up to 5 days with min/max and dominant description */
function normalizeForecast(data) {
  const list = data?.list || [];
  const byDate = new Map();
  for (const item of list) {
    const dt = item.dt * 1000;
    const dateStr = new Date(dt).toISOString().slice(0, 10);
    if (!byDate.has(dateStr)) byDate.set(dateStr, { date: dateStr, temps: [], descriptions: [] });
    const day = byDate.get(dateStr);
    if (item.main) {
      day.temps.push(item.main.temp);
      if (item.main.temp_min != null) day.temps.push(item.main.temp_min);
      if (item.main.temp_max != null) day.temps.push(item.main.temp_max);
    }
    if (item.weather?.[0]?.description) day.descriptions.push(item.weather[0].description);
  }
  const sorted = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(0, 5);
  return sorted.map(([date, day]) => ({
    date,
    temp_min: day.temps.length ? Math.min(...day.temps) : null,
    temp_max: day.temps.length ? Math.max(...day.temps) : null,
    description: day.descriptions.length ? day.descriptions[Math.floor(day.descriptions.length / 2)] : '',
  }));
}
