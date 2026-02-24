import { query } from '../db/index.js';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { validationError } from '../lib/errors.js';

const FORMATS = ['json', 'csv', 'xml', 'md', 'markdown', 'pdf'];

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
  let sql = `
    SELECT wr.id, wr.location_id, wr.requested_start_date, wr.requested_end_date,
           wr.temperature_unit, wr.notes, wr.created_at, wr.updated_at,
           l.raw_input, l.normalized_name, l.country_code, l.lat, l.lon
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
  sql += ` ORDER BY wr.created_at DESC LIMIT $${i}`;
  params.push(Math.min(Number(limit) || 500, 1000));
  const requestsResult = await query(sql, params);
  const rows = requestsResult.rows;
  if (rows.length === 0) return [];

  const ids = rows.map(r => r.id);
  const placeholders = ids.map((_, j) => `$${j + 1}`).join(', ');
  const snapResult = await query(
    `SELECT weather_request_id, snapshot_date, temp_min, temp_max, description
     FROM weather_snapshots WHERE weather_request_id IN (${placeholders}) ORDER BY weather_request_id, snapshot_date`,
    ids
  );
  const snapByRequest = new Map();
  for (const s of snapResult.rows) {
    if (!snapByRequest.has(s.weather_request_id)) snapByRequest.set(s.weather_request_id, []);
    snapByRequest.get(s.weather_request_id).push(s);
  }

  return rows.map(r => ({
    id: r.id,
    location_id: r.location_id,
    requested_start_date: r.requested_start_date,
    requested_end_date: r.requested_end_date,
    temperature_unit: r.temperature_unit,
    notes: r.notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
    raw_input: r.raw_input,
    normalized_name: r.normalized_name,
    country_code: r.country_code,
    lat: r.lat,
    lon: r.lon,
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

export function toXML(data) {
  const parts = ['<?xml version="1.0" encoding="UTF-8"?>', '<weather_export>'];
  for (const row of data) {
    const snapshots = row.snapshots || [];
    parts.push('  <request>');
    parts.push(`    <id>${row.id}</id>`);
    parts.push(`    <normalized_name>${escapeXml(row.normalized_name)}</normalized_name>`);
    parts.push(`    <country_code>${escapeXml(row.country_code)}</country_code>`);
    parts.push(`    <requested_start_date>${row.requested_start_date}</requested_start_date>`);
    parts.push(`    <requested_end_date>${row.requested_end_date}</requested_end_date>`);
    parts.push(`    <temperature_unit>${row.temperature_unit}</temperature_unit>`);
    parts.push(`    <notes>${escapeXml(row.notes)}</notes>`);
    parts.push(`    <created_at>${row.created_at}</created_at>`);
    parts.push('    <snapshots>');
    for (const s of snapshots) {
      parts.push('      <snapshot>');
      parts.push(`        <snapshot_date>${s.snapshot_date}</snapshot_date>`);
      parts.push(`        <temp_min>${s.temp_min}</temp_min>`);
      parts.push(`        <temp_max>${s.temp_max}</temp_max>`);
      parts.push(`        <description>${escapeXml(s.description)}</description>`);
      parts.push('      </snapshot>');
    }
    parts.push('    </snapshots>');
    parts.push('  </request>');
  }
  parts.push('</weather_export>');
  return parts.join('\n');
}

function escapeXml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeMarkdownText(str) {
  if (str == null) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/#/g, '\\#')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\|/g, '\\|');
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
    xml: ['application/xml', 'weather-export.xml'],
    md: ['text/markdown', 'weather-export.md'],
    pdf: ['application/pdf', 'weather-export.pdf'],
  };
  return types[format] || ['application/octet-stream', 'weather-export.txt'];
}
