import { supabase } from '../lib/supabase.js';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { validationError } from '../lib/errors.js';

const FORMATS = ['json', 'csv', 'md', 'markdown', 'pdf'];

export function getSupportedFormats() {
  return FORMATS;
}

export function validateFormat(format) {
  const f = (format || '').toLowerCase();
  if (!FORMATS.includes(f)) throw validationError(`Unsupported format. Use one of: ${FORMATS.join(', ')}`, [{ field: 'format', message: `Must be one of ${FORMATS.join(', ')}` }]);
  return f === 'markdown' ? 'md' : f;
}

/**
 * Fetch all weather requests with their snapshots for export (optional filters).
 */
export async function getExportData({ locationName, startDate, endDate, limit = 500 } = {}) {
  let query = supabase
    .from('weather_requests')
    .select(`
      id, location_id, requested_start_date, requested_end_date,
      temperature_unit, notes, created_at, updated_at,
      locations(raw_input, normalized_name, country_code, lat, lon)
    `)
    .order('created_at', { ascending: false })
    .limit(Math.min(Number(limit) || 500, 1000));
  
  if (locationName) {
    query = query.or(`locations.normalized_name.ilike.%${locationName}%,locations.raw_input.ilike.%${locationName}%`);
  }
  if (startDate) {
    query = query.gte('requested_end_date', startDate);
  }
  if (endDate) {
    query = query.lte('requested_start_date', endDate);
  }
  
  const { data: requestsData, error: requestsError } = await query;
  if (requestsError) throw requestsError;
  
  if (requestsData.length === 0) return [];

  // Fetch snapshots for all requests
  const requestIds = requestsData.map(r => r.id);
  const { data: snapshotsData, error: snapshotsError } = await supabase
    .from('weather_snapshots')
    .select('weather_request_id, snapshot_date, temp_min, temp_max, description')
    .in('weather_request_id', requestIds)
    .order('snapshot_date', { ascending: true });
  
  if (snapshotsError) throw snapshotsError;

  // Map snapshots by request ID
  const snapByRequest = new Map();
  for (const s of snapshotsData || []) {
    if (!snapByRequest.has(s.weather_request_id)) {
      snapByRequest.set(s.weather_request_id, []);
    }
    snapByRequest.get(s.weather_request_id).push(s);
  }

  // Flatten and enrich data
  return requestsData.map(r => ({
    id: r.id,
    location_id: r.location_id,
    requested_start_date: r.requested_start_date,
    requested_end_date: r.requested_end_date,
    temperature_unit: r.temperature_unit,
    notes: r.notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
    raw_input: r.locations?.raw_input,
    normalized_name: r.locations?.normalized_name,
    country_code: r.locations?.country_code,
    lat: r.locations?.lat,
    lon: r.locations?.lon,
    snapshots: snapByRequest.get(r.id) || [],
  }));
}

export function toJSON(data) {
  return JSON.stringify(data, null, 2);
}

export function toCSV(data) {
  const header = 'id,normalized_name,country_code,requested_start_date,requested_end_date,temperature_unit,notes,created_at,snapshot_date,temp_min,temp_max,description';
  const lines = [header];
  for (const row of data) {
    const snapshots = row.snapshots || [];
    if (snapshots.length === 0) {
      lines.push([row.id, row.normalized_name, row.country_code, row.requested_start_date, row.requested_end_date, row.temperature_unit, escapeCsv(row.notes), row.created_at, '', '', '', ''].join(','));
    } else {
      for (const s of snapshots) {
        lines.push([row.id, row.normalized_name, row.country_code, row.requested_start_date, row.requested_end_date, row.temperature_unit, escapeCsv(row.notes), row.created_at, s.snapshot_date, s.temp_min, s.temp_max, escapeCsv(s.description)].join(','));
      }
    }
  }
  return lines.join('\n');
}

function escapeCsv(val) {
  if (val == null) return '';
  const s = String(val);
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function escapeMarkdownText(val) {
  if (val == null) return '';
  return String(val);
}

export function toMarkdown(data) {
  const lines = ['# Weather Export', ''];
  for (const row of data) {
    const snapshots = row.snapshots || [];
    const name = escapeMarkdownText(row.normalized_name);
    const country = escapeMarkdownText(row.country_code);
    lines.push(`## ${name} (${country})`);
    lines.push(`- **Request ID:** ${row.id}`);
    lines.push(`- **Date range:** ${row.requested_start_date} to ${row.requested_end_date}`);
    lines.push(`- **Unit:** °${row.temperature_unit}`);
    lines.push(`- **Created:** ${row.created_at}`);
    if (row.notes) lines.push(`- **Notes:** ${escapeMarkdownText(row.notes)}`);
    lines.push('');
    lines.push('| Date | Min ° | Max ° | Description |');
    lines.push('|------|-------|-------|-------------|');
    for (const s of snapshots) {
      const desc = (s.description || '-').replace(/\|/g, '\\|');
      lines.push(`| ${s.snapshot_date} | ${s.temp_min ?? '-'} | ${s.temp_max ?? '-'} | ${desc} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

const PDF_MARGIN = 50;
const PDF_LINE_HEIGHT = 14;
const PDF_FONT_TITLE = 18;
const PDF_FONT_HEAD = 14;
const PDF_FONT_BODY = 10;

export async function toPDF(data) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  let page = doc.addPage();
  const { width, height } = page.getSize();
  let y = height - PDF_MARGIN;

  function drawText(text, size = PDF_FONT_BODY) {
    if (y < PDF_MARGIN + PDF_LINE_HEIGHT) {
      page = doc.addPage();
      y = height - PDF_MARGIN;
    }
    page.drawText(String(text).slice(0, 500), {
      x: PDF_MARGIN,
      y,
      size,
      font,
    });
    y -= size + 4;
  }

  drawText('Weather Export', PDF_FONT_TITLE);
  y -= 8;

  for (const row of data) {
    const snapshots = row.snapshots || [];
    const name = (row.normalized_name != null ? String(row.normalized_name) : '').slice(0, 200);
    const country = (row.country_code != null ? String(row.country_code) : '').slice(0, 10);
    drawText(`${name} (${country})`, PDF_FONT_HEAD);
    drawText(`Request #${row.id} | ${row.requested_start_date} to ${row.requested_end_date} | °${row.temperature_unit}`);
    for (const s of snapshots) {
      const desc = (s.description != null ? String(s.description) : '-').slice(0, 100);
      drawText(`  ${s.snapshot_date}: ${s.temp_min ?? '-'}° to ${s.temp_max ?? '-'}° — ${desc}`);
    }
    y -= 4;
  }

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

export function getContentTypeAndFilename(format) {
  const types = {
    json: ['application/json', 'weather-export.json'],
    csv: ['text/csv', 'weather-export.csv'],
    md: ['text/markdown', 'weather-export.md'],
    pdf: ['application/pdf', 'weather-export.pdf'],
  };
  return types[format] || ['application/octet-stream', 'weather-export.txt'];
}
