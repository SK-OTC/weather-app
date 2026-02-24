const API_BASE = `${import.meta.env.VITE_API_URL}/api` || '/api';

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

export async function createWeatherRequest(body) {
  const res = await fetch(`${API_BASE}/weather-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function listWeatherRequests(params = {}) {
  const q = new URLSearchParams(params).toString();
  const url = `${API_BASE}/weather-requests${q ? `?${q}` : ''}`;
  const res = await fetch(url);
  return handleResponse(res);
}

export async function getWeatherRequest(id) {
  const res = await fetch(`${API_BASE}/weather-requests/${id}`);
  return handleResponse(res);
}

export async function updateWeatherRequest(id, body) {
  const res = await fetch(`${API_BASE}/weather-requests/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function deleteWeatherRequest(id) {
  const res = await fetch(`${API_BASE}/weather-requests/${id}`, { method: 'DELETE' });
  if (res.status === 204) return;
  return handleResponse(res);
}

export function getExportUrl(format, params = {}) {
  const q = new URLSearchParams({ format, ...params }).toString();
  return `${API_BASE}/export?${q}`;
}
