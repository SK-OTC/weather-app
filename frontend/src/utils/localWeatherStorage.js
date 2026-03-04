const STORAGE_KEY = 'weather.pendingResults.v1';
const MAX_RESULTS = 50;

function safeParse(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getComparableTimestamp(value) {
  const time = new Date(value || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function normalizeStoredItem(item) {
  const searchedAt = item?.searchedAt || item?.savedAt || new Date().toISOString();
  return {
    locationInput: String(item?.locationInput || '').trim(),
    locationType: item?.locationType || 'city',
    startDate: item?.startDate,
    endDate: item?.endDate,
    units: item?.units || 'metric',
    notes: item?.notes ?? null,
    searchedAt,
    result: item?.result,
  };
}

function makeMergeKey(item) {
  const location = String(item.locationInput || '').trim().toLowerCase();
  return [location, item.locationType || 'city', item.startDate || '', item.endDate || '', item.units || 'metric'].join('|');
}

function writeItems(items) {
  const normalized = items
    .map(normalizeStoredItem)
    .filter((item) => item.locationInput && item.startDate && item.endDate)
    .sort((a, b) => getComparableTimestamp(b.searchedAt) - getComparableTimestamp(a.searchedAt))
    .slice(0, MAX_RESULTS);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return { saved: true, trimmed: items.length > normalized.length };
  } catch {
    const fallback = normalized.slice(0, Math.max(1, Math.floor(MAX_RESULTS / 2)));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
      return { saved: true, trimmed: true };
    } catch {
      return { saved: false, trimmed: true };
    }
  }
}

export function getPendingWeatherResults() {
  if (typeof localStorage === 'undefined') return [];
  return safeParse(localStorage.getItem(STORAGE_KEY)).map(normalizeStoredItem);
}

export function clearPendingWeatherResults() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function addPendingWeatherResult(item) {
  const nextItem = normalizeStoredItem({
    ...item,
    searchedAt: item?.searchedAt || new Date().toISOString(),
  });

  const existing = getPendingWeatherResults();
  return writeItems([nextItem, ...existing]);
}

export function removePendingWeatherResult(item) {
  const normalized = normalizeStoredItem(item);
  const targetKey = makeMergeKey(normalized);
  const existing = getPendingWeatherResults();
  const filtered = existing.filter((row) => {
    const rowKey = makeMergeKey(row);
    if (rowKey !== targetKey) return true;
    return row.searchedAt !== normalized.searchedAt;
  });
  return writeItems(filtered);
}

export function getLatestPendingResult() {
  const items = getPendingWeatherResults();
  if (!items.length) return null;
  return items.sort((a, b) => getComparableTimestamp(b.searchedAt) - getComparableTimestamp(a.searchedAt))[0];
}
