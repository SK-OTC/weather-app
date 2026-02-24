import { z } from 'zod';
import * as locationService from './locationService.js';
import * as weatherService from './weatherService.js';
import * as weatherRequestsDb from '../db/weatherRequests.js';
import * as weatherSnapshotsDb from '../db/weatherSnapshots.js';
import { validationError, notFoundError } from '../lib/errors.js';

const locationTypeSchema = z.enum(['city', 'zip', 'coords', 'landmark']);
const unitsSchema = z.enum(['metric', 'imperial']).optional().default('metric');

const createSchema = z.object({
  locationInput: z.string().min(1, 'Location is required').transform(s => s.trim()),
  locationType: locationTypeSchema.optional().default('city'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)'),
  units: unitsSchema,
  notes: z.string().optional().nullable(),
});

const updateSchema = z.object({
  selectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  units: unitsSchema.optional(),
  notes: z.string().optional().nullable(),
});

function parseZodError(zodError) {
  if (zodError.errors && Array.isArray(zodError.errors)) {
    return zodError.errors.map(e => ({ field: (e.path || []).join('.'), message: e.message }));
  }
  const flat = zodError.flatten?.();
  if (flat?.fieldErrors) return flat.fieldErrors;
  return null;
}

function parseLocalDate(dateStr) {
  const parts = String(dateStr).split('-').map(Number);
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function validateDateRange(startDate, endDate) {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  if (!start || !end) throw validationError('Invalid date value. Use YYYY-MM-DD and a real calendar date.');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (start > end) throw validationError('Start date must be before or equal to end date.');
  if (start < today) throw validationError('Start date cannot be in the past. Only forecast (today and future) is supported.');
  
  // Calculate the number of days between today and end date
  const diffTime = end - today;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays > 5) throw validationError('End date cannot be more than 5 days from today.');
}

export async function createWeatherRequest(body) {
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw validationError('Invalid input', parseZodError(parsed.error));
  const { locationInput, locationType, startDate, endDate, units, notes } = parsed.data;
  validateDateRange(startDate, endDate);

  const location = await locationService.resolveAndPersistLocation(locationInput, locationType);
  const temperature_unit = units === 'imperial' ? 'F' : 'C';

  const { current, forecast } = await weatherService.getCurrentAndForecast({
    lat: location.lat,
    lon: location.lon,
    units,
  });

  const request = await weatherRequestsDb.createRequest({
    location_id: location.id,
    requested_start_date: startDate,
    requested_end_date: endDate,
    temperature_unit,
    current_temp: current?.temp,
    current_feels_like: current?.feels_like,
    notes: notes || null,
  });

  const snapshots = forecast.map(day => ({
    weather_request_id: request.id,
    snapshot_date: day.date,
    temp_min: day.temp_min,
    temp_max: day.temp_max,
    description: day.description || null,
    raw_api_payload: day,
  }));
  if (snapshots.length) await weatherSnapshotsDb.insertSnapshots(snapshots);

  const snapshotsList = await weatherSnapshotsDb.getSnapshotsByRequestId(request.id);
  return {
    request: { ...request, raw_input: location.raw_input, normalized_name: location.normalized_name, country_code: location.country_code, lat: location.lat, lon: location.lon },
    location,
    current,
    forecast,
    snapshots: snapshotsList,
  };
}

export async function listWeatherRequests({ locationName, startDate, endDate, limit, offset } = {}) {
  const limitNum = Math.min(Number(limit) || 50, 100);
  const offsetNum = Math.max(0, Number(offset) || 0);
  return weatherRequestsDb.listRequests({
    locationName: locationName || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    limit: limitNum,
    offset: offsetNum,
  });
}

export async function getWeatherRequestById(id) {
  const request = await weatherRequestsDb.getRequestById(id);
  if (!request) throw notFoundError('Weather request not found');
  const snapshots = await weatherSnapshotsDb.getSnapshotsByRequestId(id);
  return { ...request, snapshots };
}

export async function updateWeatherRequest(id, body) {
  const existing = await weatherRequestsDb.getRequestById(id);
  if (!existing) throw notFoundError('Weather request not found');

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) throw validationError('Invalid input', parseZodError(parsed.error));
  const updates = parsed.data;

  let startDate = existing.requested_start_date;
  let endDate = existing.requested_end_date;
  let temperature_unit = existing.temperature_unit;
  let current_temp = existing.current_temp;
  let current_feels_like = existing.current_feels_like;

  // Handle temperature unit conversion
  if (updates.units) {
    const oldUnit = temperature_unit;
    temperature_unit = updates.units === 'imperial' ? 'F' : 'C';
    
    // Convert existing temperatures if unit changed
    if (oldUnit !== temperature_unit) {
      if (oldUnit === 'C' && temperature_unit === 'F') {
        // C to F: (C * 9/5) + 32
        current_temp = current_temp ? (current_temp * 9 / 5) + 32 : current_temp;
        current_feels_like = current_feels_like ? (current_feels_like * 9 / 5) + 32 : current_feels_like;
      } else if (oldUnit === 'F' && temperature_unit === 'C') {
        // F to C: (F - 32) * 5/9
        current_temp = current_temp ? (current_temp - 32) * 5 / 9 : current_temp;
        current_feels_like = current_feels_like ? (current_feels_like - 32) * 5 / 9 : current_feels_like;
      }
      
      // Convert all snapshots
      const existingSnapshots = await weatherSnapshotsDb.getSnapshotsByRequestId(id);
      for (const snapshot of existingSnapshots) {
        let convertedMinTemp = snapshot.temp_min;
        let convertedMaxTemp = snapshot.temp_max;
        
        if (oldUnit === 'C' && temperature_unit === 'F') {
          convertedMinTemp = convertedMinTemp ? (convertedMinTemp * 9 / 5) + 32 : convertedMinTemp;
          convertedMaxTemp = convertedMaxTemp ? (convertedMaxTemp * 9 / 5) + 32 : convertedMaxTemp;
        } else if (oldUnit === 'F' && temperature_unit === 'C') {
          convertedMinTemp = convertedMinTemp ? (convertedMinTemp - 32) * 5 / 9 : convertedMinTemp;
          convertedMaxTemp = convertedMaxTemp ? (convertedMaxTemp - 32) * 5 / 9 : convertedMaxTemp;
        }
        
        // Update snapshot with converted temperatures
        await weatherSnapshotsDb.updateSnapshot(snapshot.id, {
          temp_min: convertedMinTemp,
          temp_max: convertedMaxTemp,
        });
      }
    }
  }

  // If selectedDate is provided, set both start and end to that date
  if (updates.selectedDate) {
    startDate = updates.selectedDate;
    endDate = updates.selectedDate;

    // Try to find temperature data from existing snapshots
    const existingSnapshots = await weatherSnapshotsDb.getSnapshotsByRequestId(id);
    const selectedSnapshot = existingSnapshots.find((s) => s.snapshot_date === updates.selectedDate);

    if (selectedSnapshot) {
      // Use temp data from existing snapshot
      current_temp = (selectedSnapshot.temp_min + selectedSnapshot.temp_max) / 2;
      current_feels_like = current_temp; // Use average as feels_like
    } else {
      // Fetch from OpenWeather API for this date
      const units = temperature_unit === 'F' ? 'imperial' : 'metric';
      const { current, forecast } = await weatherService.getCurrentAndForecast({
        lat: existing.lat,
        lon: existing.lon,
        units,
      });

      // Find the forecast for the selected date
      const selectedForecast = forecast.find((f) => f.date === updates.selectedDate);
      if (selectedForecast) {
        current_temp = (selectedForecast.temp_min + selectedForecast.temp_max) / 2;
        current_feels_like = current_temp;
      } else {
        // Selected date is outside the 5-day forecast, use current weather
        current_temp = current?.temp;
        current_feels_like = current?.feels_like;
      }
    }
    
    // Delete snapshots that are not the selected date (cleanup unused snapshots)
    const allSnapshots = await weatherSnapshotsDb.getSnapshotsByRequestId(id);
    for (const snapshot of allSnapshots) {
      if (snapshot.snapshot_date !== updates.selectedDate) {
        await weatherSnapshotsDb.deleteSnapshot(snapshot.id);
      }
    }
  }

  const updated = await weatherRequestsDb.updateRequest(id, {
    requested_start_date: startDate,
    requested_end_date: endDate,
    temperature_unit,
    current_temp,
    current_feels_like,
    notes: updates.notes !== undefined ? updates.notes : undefined,
  });

  const snapshotsList = await weatherSnapshotsDb.getSnapshotsByRequestId(id);
  return { ...updated, snapshots: snapshotsList };
}

export async function deleteWeatherRequest(id) {
  const existing = await weatherRequestsDb.getRequestById(id);
  if (!existing) throw notFoundError('Weather request not found');
  await weatherSnapshotsDb.deleteSnapshotsByRequestId(id);
  await weatherRequestsDb.deleteRequest(id);
}
