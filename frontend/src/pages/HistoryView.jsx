import { useState, useEffect } from 'react';
import {
  listWeatherRequests,
  getWeatherRequest,
  updateWeatherRequest,
  deleteWeatherRequest,
  getExportUrl,
} from '../api/client';
import ErrorBanner from '../components/ErrorBanner';
import ReadRequestDialog from '../components/ReadRequestDialog';
import EditRequestDialog from '../components/EditRequestDialog';
import './HistoryView.css';

export default function HistoryView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [exportFormat, setExportFormat] = useState('json');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listWeatherRequests({ limit: 100 });
      setItems(res.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleView = async (id) => {
    setError(null);
    try {
      const data = await getWeatherRequest(id);
      setViewingId(id);
      setViewData({
        id,
        current_temp: data.current_temp,
        temperature_unit: data.temperature_unit,
        notes: data.notes || '',
        snapshots: data.snapshots || [],
        locationName: data.normalized_name || data.raw_input,
        requested_start_date: data.requested_start_date,
        lat: data.lat,
        lon: data.lon,
      });
    } catch (err) {
      setError(err.message || 'Failed to load request.');
    }
  };

  const makeDateReadable = (date) => {
    if (!date) return null;
    const d = new Date(date);    
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  const handleEditFromView = (id) => {
    if (!viewData) return;
    setEditingId(id);
    setEditForm({ ...viewData });
    setViewingId(null);
    setViewData(null);
  };

  const handleSaveEdit = async (editData) => {
    if (!editingId) return;
    setError(null);
    try {
      const { selectedDate, temperatureUnit, notes } = editData;
      
      // Call backend to update with the selected date, unit, and notes
      await updateWeatherRequest(editingId, {
        selectedDate,
        units: temperatureUnit === 'F' ? 'imperial' : 'metric',
        notes: notes || undefined,
      });
      
      setEditingId(null);
      setEditForm(null);
      setViewingId(null);
      setViewData(null);
      load();
    } catch (err) {
      setError(err.message || 'Failed to update.');
      if (err.details && Array.isArray(err.details)) {
        const msg = err.details.map((d) => d.message || d).join(' ');
        if (msg) setError((prev) => prev + ' ' + msg);
      }
    }
  };

  const handleDelete = async (id) => {
    setError(null);
    try {
      await deleteWeatherRequest(id);
      load();
    } catch (err) {
      setError(err.message || 'Failed to delete.');
    }
  };

  const handleExport = (format) => {
    const fmt = format || exportFormat;
    const url = getExportUrl(fmt);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weather-export.${fmt === 'md' ? 'md' : fmt === 'json' ? 'json' : fmt}`;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="history-view">
      <h2>Saved weather requests</h2>
      <p className="history-desc">View, delete, or export your saved requests. Click View to edit.</p>

      <div className="export-panel">
        <label>
          Export format
          <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="xml">XML</option>
            <option value="md">Markdown</option>
            <option value="pdf">PDF</option>
          </select>
        </label>
        <button type="button" className="btn btn-primary" onClick={() => handleExport()}>
          Download export
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {loading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <p className="empty-state">No saved requests yet. Use the Search page to get weather and save it.</p>
      ) : (
        <div className="history-list">
          {items.map((row) => (
            <div key={row.id} className="history-card">
              <div className="history-card-main">
                <strong>{row.normalized_name || row.raw_input}</strong>
                {row.country_code && <span> ({row.country_code ? new Intl.DisplayNames(['en'], { type: 'region' }).of(row.country_code) : null})</span>}
                <div className="history-meta">
                  {row.current_temp ? Math.round(row.current_temp) : 'N/A'}°{row.temperature_unit} on {makeDateReadable(row.requested_start_date)} · {row.updated_at != row.created_at ? 'Updated ' : 'Saved '} {makeDateReadable(row.updated_at || row.created_at)}
                </div>
              </div>
              <div className="history-actions">
                <button type="button" className="btn btn-small" onClick={() => handleView(row.id)}>View</button>
                <button type="button" className="btn btn-small" onClick={() => handleExport(exportFormat)}>Export</button>
                <button type="button" className="btn btn-small btn-danger" onClick={() => handleDelete(row.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewingId && viewData && (
        <ReadRequestDialog
          data={viewData}
          onEdit={() => handleEditFromView(viewData.id)}
          onClose={() => { setViewingId(null); setViewData(null); setEditingId(null); setEditForm(null); }}
        />
      )}

      {editingId && editForm && (
        <EditRequestDialog
          initial={editForm}
          snapshots={viewData?.snapshots || []}
          locationName={viewData?.locationName || 'Location'}
          onSave={handleSaveEdit}
          onClose={() => { setEditingId(null); setEditForm(null); setViewingId(null); setViewData(null); }}
        />
      )}
    </div>
  );
}
