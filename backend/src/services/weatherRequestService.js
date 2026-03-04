import { z } from 'zod';
import * as locationService from './locationService.js';
import * as weatherService from './weatherService.js';
import * as weatherRequestsDb from '../db/weatherRequests.js';
import * as weatherSnapshotsDb from '../db/weatherSnapshots.js';
import { validationError, notFoundError } from '../lib/errors.js';
import * as globalSearchCountsDb from '../db/globalSearchCounts.js';

const locationTypeSchema = z.enum(['city', 'zip', 'coords', 'landmark']);
const unitsSchema = z.enum(['metric', 'imperial']).optional().default('metric');

const createSchema = z.object({
  locationInput: z.string().min(1, 'Location is required').transform(s => s.trim()),
  locationType: locationTypeSchema.optional().default('city'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)'),
  units: unitsSchema,
  notes: z.string().optional().nullable(),
  userId: z.string().uuid().optional(),
  persistToAccount: z.boolean().optional().default(false),
});

const updateSchema = z.object({
  selectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  units: unitsSchema.optional(),
  notes: z.string().optional().nullable(),
});

const syncItemSchema = z.object({
  locationInput: z.string().min(1).transform(s => s.trim()),
  locationType: locationTypeSchema.optional().default('city'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  units: unitsSchema,
  notes: z.string().optional().nullable(),
  searchedAt: z.string().datetime().optional(),
  result: z.object({
    location: z.object({
      normalized_name: z.string().optional().nullable(),
      country_code: z.string().optional().nullable(),
      lat: z.number(),
      lon: z.number(),
      raw_input: z.string().optional().nullable(),
    }).optional(),
    current: z.object({
      temp: z.number().optional().nullable(),
      feels_like: z.number().optional().nullable(),
    }).optional(),
    forecast: z.array(z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      temp_min: z.number().optional().nullable(),
      temp_max: z.number().optional().nullable(),
      description: z.string().optional().nullable(),
    })).optional(),
  }).optional(),
});

const syncSchema = z.object({
  userId: z.string().uuid(),
  items: z.array(syncItemSchema).max(50),
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
  const { locationInput, locationType, startDate, endDate, units, notes, userId, persistToAccount } = parsed.data;
  if (persistToAccount && !userId) throw validationError('userId is required when persistToAccount is true.');
  validateDateRange(startDate, endDate);

  const location = await locationService.resolveAndPersistLocation(locationInput, locationType);
  await globalSearchCountsDb.incrementLocationSearch(location.id);
  const temperature_unit = units === 'imperial' ? 'F' : 'C';

  const { current, forecast } = await weatherService.getCurrentAndForecast({
    lat: location.lat,
    lon: location.lon,
    units,
  });

  let request = null;
  let snapshotsList = [];

  if (persistToAccount) {
    request = await weatherRequestsDb.createRequest({
      location_id: location.id,
      requested_start_date: startDate,
      requested_end_date: endDate,
      temperature_unit,
      current_temp: current?.temp,
      current_feels_like: current?.feels_like,
      notes: notes || null,
      user_id: userId,
      searched_at: new Date().toISOString(),
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
    snapshotsList = await weatherSnapshotsDb.getSnapshotsByRequestId(request.id);
  }

  const responseRequest = request || {
    raw_input: location.raw_input,
    normalized_name: location.normalized_name,
    country_code: location.country_code,
    lat: location.lat,
    lon: location.lon,
    temperature_unit,
    requested_start_date: startDate,
    requested_end_date: endDate,
    notes: notes || null,
    searched_at: new Date().toISOString(),
  };

  return {
    request: { ...responseRequest, raw_input: location.raw_input, normalized_name: location.normalized_name, country_code: location.country_code, lat: location.lat, lon: location.lon },
    location,
    current,
    forecast,
    snapshots: snapshotsList,
  };
}

export async function listWeatherRequests({ locationName, startDate, endDate, limit, offset, userId } = {}) {
  const limitNum = Math.min(Number(limit) || 50, 100);
  const offsetNum = Math.max(0, Number(offset) || 0);
  return weatherRequestsDb.listRequests({
    locationName: locationName || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    limit: limitNum,
    offset: offsetNum,
    userId,
  });
}

export async function getWeatherRequestById(id, userId) {
  const request = await weatherRequestsDb.getRequestById(id, userId);
  if (!request) throw notFoundError('Weather request not found');
  const snapshots = await weatherSnapshotsDb.getSnapshotsByRequestId(id);
  return { ...request, snapshots };
}

export async function updateWeatherRequest(id, body, userId) {
  const existing = await weatherRequestsDb.getRequestById(id, userId);
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
        current_temp = current_temp != null ? (current_temp * 9 / 5) + 32 : current_temp;
        current_feels_like = current_feels_like != null ? (current_feels_like * 9 / 5) + 32 : current_feels_like;
      } else if (oldUnit === 'F' && temperature_unit === 'C') {
        // F to C: (F - 32) * 5/9
        current_temp = current_temp != null ? (current_temp - 32) * 5 / 9 : current_temp;
        current_feels_like = current_feels_like != null ? (current_feels_like - 32) * 5 / 9 : current_feels_like;
      }
      
      // Convert all snapshots
      const existingSnapshots = await weatherSnapshotsDb.getSnapshotsByRequestId(id);
      for (const snapshot of existingSnapshots) {
        let convertedMinTemp = snapshot.temp_min;
        let convertedMaxTemp = snapshot.temp_max;
        
        if (oldUnit === 'C' && temperature_unit === 'F') {
          convertedMinTemp = convertedMinTemp != null ? (convertedMinTemp * 9 / 5) + 32 : convertedMinTemp;
          convertedMaxTemp = convertedMaxTemp != null ? (convertedMaxTemp * 9 / 5) + 32 : convertedMaxTemp;
        } else if (oldUnit === 'F' && temperature_unit === 'C') {
          convertedMinTemp = convertedMinTemp != null ? (convertedMinTemp - 32) * 5 / 9 : convertedMinTemp;
          convertedMaxTemp = convertedMaxTemp != null ? (convertedMaxTemp - 32) * 5 / 9 : convertedMaxTemp;
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
  }, userId);

  const snapshotsList = await weatherSnapshotsDb.getSnapshotsByRequestId(id);
  return { ...updated, snapshots: snapshotsList };
}

export async function deleteWeatherRequest(id, userId) {
  const existing = await weatherRequestsDb.getRequestById(id, userId);
  if (!existing) throw notFoundError('Weather request not found');
  await weatherSnapshotsDb.deleteSnapshotsByRequestId(id);
  await weatherRequestsDb.deleteRequest(id, userId);
}

function parseSearchedAt(value) {
  if (!value) return new Date().toISOString();
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString();
}

function getLatestTimestamp(first, second) {
  const firstTime = new Date(first).getTime();
  const secondTime = new Date(second).getTime();
  if (Number.isNaN(firstTime)) return second;
  if (Number.isNaN(secondTime)) return first;
  return firstTime >= secondTime ? first : second;
}

async function resolveLocationForSync(item) {
  const syncLocation = item.result?.location;
  if (syncLocation?.lat != null && syncLocation?.lon != null) {
    return locationService.persistResolvedLocation({
      rawInput: syncLocation.raw_input || item.locationInput,
      normalizedName: syncLocation.normalized_name || item.locationInput,
      countryCode: syncLocation.country_code || '',
      lat: syncLocation.lat,
      lon: syncLocation.lon,
    });
  }
  return locationService.resolveAndPersistLocation(item.locationInput, item.locationType || 'city');
}

export async function syncLocalWeatherResults(payload) {
  const parsed = syncSchema.safeParse(payload);
  if (!parsed.success) throw validationError('Invalid sync payload', parseZodError(parsed.error));

  const { userId, items } = parsed.data;
  let created = 0;
  let merged = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const location = await resolveLocationForSync(item);
      const temperature_unit = item.units === 'imperial' ? 'F' : 'C';
      const searchedAt = parseSearchedAt(item.searchedAt);
      const currentTemp = item.result?.current?.temp ?? null;
      const currentFeelsLike = item.result?.current?.feels_like ?? null;

      const existing = await weatherRequestsDb.findRequestForUserMerge({
        userId,
        location_id: location.id,
        requested_start_date: item.startDate,
        requested_end_date: item.endDate,
        temperature_unit,
      });

      if (existing) {
        const effectiveSearchedAt = getLatestTimestamp(existing.searched_at || searchedAt, searchedAt);
        await weatherRequestsDb.updateRequest(existing.id, {
          current_temp: currentTemp != null ? currentTemp : existing.current_temp,
          current_feels_like: currentFeelsLike != null ? currentFeelsLike : existing.current_feels_like,
          notes: item.notes !== undefined ? item.notes : existing.notes,
          searched_at: effectiveSearchedAt,
        }, userId);

        const forecast = item.result?.forecast || [];
        if (forecast.length) {
          await weatherSnapshotsDb.deleteSnapshotsByRequestId(existing.id);
          await weatherSnapshotsDb.insertSnapshots(
            forecast.map((day) => ({
              weather_request_id: existing.id,
              snapshot_date: day.date,
              temp_min: day.temp_min,
              temp_max: day.temp_max,
              description: day.description || null,
              raw_api_payload: day,
            }))
          );
        }

        merged += 1;
      } else {
        const createdRequest = await weatherRequestsDb.createRequest({
          user_id: userId,
          location_id: location.id,
          requested_start_date: item.startDate,
          requested_end_date: item.endDate,
          temperature_unit,
          current_temp: currentTemp,
          current_feels_like: currentFeelsLike,
          notes: item.notes || null,
          searched_at: searchedAt,
        });

        const forecast = item.result?.forecast || [];
        if (forecast.length) {
          await weatherSnapshotsDb.insertSnapshots(
            forecast.map((day) => ({
              weather_request_id: createdRequest.id,
              snapshot_date: day.date,
              temp_min: day.temp_min,
              temp_max: day.temp_max,
              description: day.description || null,
              raw_api_payload: day,
            }))
          );
        }
        created += 1;
      }
    } catch (error) {
      failed += 1;
    }
  }

  return {
    total: items.length,
    created,
    merged,
    failed,
    success: failed === 0,
  };
}
