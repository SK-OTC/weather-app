import { supabase } from './supabaseClient';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiFetch(url, options, { retries = 2, retryDelayMs = 300 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (attempt >= retries) throw error;
      attempt += 1;
      await delay(retryDelayMs * attempt);
    }
  }
}

async function withAuthHeaders(headers = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return headers;
  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
}

async function handleResponse(res) {
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON response (e.g. 502 HTML)
    }
  }
  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && data.message) || res.statusText || 'Request failed';
    const err = new Error(message);
    err.code = data?.code;
    err.status = res.status;
    err.details = data?.details;
    throw err;
  }
  return data;
}

export async function createWeatherRequest(body, userId) {
  const headers = await withAuthHeaders({ 'Content-Type': 'application/json' });
  const res = await apiFetch(`${API_BASE}/weather-requests`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function listWeatherRequests(params = {}, userId) {
  const q = new URLSearchParams(params).toString();
  const url = `${API_BASE}/weather-requests${q ? `?${q}` : ''}`;
  const headers = await withAuthHeaders();
  const res = await apiFetch(url, { headers });
  return handleResponse(res);
}

export async function getWeatherRequest(id, userId) {
  const headers = await withAuthHeaders();
  const res = await apiFetch(`${API_BASE}/weather-requests/${id}`, { headers });
  return handleResponse(res);
}

export async function updateWeatherRequest(id, body, userId) {
  const headers = await withAuthHeaders({ 'Content-Type': 'application/json' });
  const res = await apiFetch(`${API_BASE}/weather-requests/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function deleteWeatherRequest(id, userId) {
  const headers = await withAuthHeaders();
  const res = await apiFetch(`${API_BASE}/weather-requests/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (res.status === 204) return;
  return handleResponse(res);
}

export async function syncWeatherResults(userId, items) {
  const headers = await withAuthHeaders({ 'Content-Type': 'application/json' });
  const res = await apiFetch(`${API_BASE}/weather-requests/sync`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ items }),
  });
  return handleResponse(res);
}

export async function listGlobalSearchCounts(limit = 20) {
  const q = new URLSearchParams({ limit: String(limit) }).toString();
  const headers = await withAuthHeaders();
  const res = await apiFetch(`${API_BASE}/weather-requests/global-searches?${q}`, { headers });
  return handleResponse(res);
}

export function getExportUrl(format, params = {}) {
  const q = new URLSearchParams({ format, ...params }).toString();
  return `${API_BASE}/export?${q}`;
}

export async function downloadExport(format, params = {}, userId) {
  const q = new URLSearchParams({ format, ...params }).toString();
  const headers = await withAuthHeaders();
  const res = await apiFetch(`${API_BASE}/export?${q}`, {
    headers,
  });

  if (!res.ok) {
    await handleResponse(res);
  }

  const blob = await res.blob();
  const contentDisposition = res.headers.get('content-disposition') || '';
  const fileNameMatch = contentDisposition.match(/filename="?([^\";]+)"?/i);
  const filename = fileNameMatch?.[1] || `weather-export.${format}`;
  return { blob, filename };
}
