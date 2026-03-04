import { useState, useEffect, useMemo } from 'react';
import {
  listWeatherRequests,
  getWeatherRequest,
  updateWeatherRequest,
  deleteWeatherRequest,
  downloadExport,
  listGlobalSearchCounts,
} from '../api/client';
import {
  getPendingWeatherResults,
  removePendingWeatherResult,
} from '../utils/localWeatherStorage';
import ErrorBanner from '../components/ErrorBanner';
import ReadRequestDialog from '../components/ReadRequestDialog';
import EditRequestDialog from '../components/EditRequestDialog';
import './HistoryView.css';

export default function HistoryView({ userId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [exportFormat, setExportFormat] = useState('json');
  const [successMessage, setSuccessMessage] = useState('');
  const [showGlobalResults, setShowGlobalResults] = useState(false);
  const [globalItems, setGlobalItems] = useState([]);
  const regionNames = useMemo(() => new Intl.DisplayNames(['en'], { type: 'region' }), []);
  const globalSummary = useMemo(() => {
    if (!globalItems.length) return { totalQueries: 0, lastUpdatedText: 'N/A' };

    const totalQueries = globalItems.reduce((sum, row) => sum + (Number(row.search_count) || 0), 0);
    const latestEpoch = globalItems.reduce((latest, row) => {
      const epoch = new Date(row.updated_at || 0).getTime();
      return Number.isNaN(epoch) ? latest : Math.max(latest, epoch);
    }, 0);
    const lastUpdatedText = latestEpoch
      ? new Date(latestEpoch).toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'N/A';

    return { totalQueries, lastUpdatedText };
  }, [globalItems]);
  const maxGlobalCount = useMemo(
    () => Math.max(...globalItems.map((item) => Number(item.search_count) || 0), 1),
    [globalItems]
  );

  const mapLocalItemToRow = (item, idx) => {
    const currentTemp = item.result?.current?.temp ?? null;
    const unit = item.units === 'imperial' ? 'F' : 'C';
    return {
      id: `local-${idx}`,
      normalized_name: item.result?.request?.normalized_name || item.result?.location?.normalized_name || item.locationInput,
      raw_input: item.locationInput,
      country_code: item.result?.request?.country_code || item.result?.location?.country_code || '',
      current_temp: currentTemp,
      temperature_unit: unit,
      requested_start_date: item.startDate,
      created_at: item.searchedAt,
      updated_at: item.searchedAt,
      __local: true,
      __localItem: item,
    };
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!userId) {
        const pending = getPendingWeatherResults();
        setItems(pending.map(mapLocalItemToRow));
        return;
      }
      const res = await listWeatherRequests({ limit: 100 }, userId);
      setItems(res.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setShowGlobalResults(false);
    const historySuccess = sessionStorage.getItem('history.success');
    if (historySuccess) {
      setSuccessMessage(historySuccess);
      sessionStorage.removeItem('history.success');
    }
    load();
  }, [userId]);

  const loadGlobalSearches = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listGlobalSearchCounts(100);
      setGlobalItems(res.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load global search results.');
      setShowGlobalResults(false);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGlobalResults = async () => {
    if (showGlobalResults) {
      setShowGlobalResults(false);
      return;
    }
    await loadGlobalSearches();
    setShowGlobalResults(true);
  };

  const handleView = async (id) => {
    setError(null);
    try {
      const localRow = items.find((row) => row.id === id && row.__local);
      if (localRow) {
        const localResult = localRow.__localItem?.result || {};
        setViewingId(id);
        setViewData({
          id,
          current_temp: localResult.current?.temp,
          temperature_unit: localRow.temperature_unit,
          notes: localRow.__localItem?.notes || '',
          snapshots: localResult.forecast || [],
          locationName: localRow.normalized_name || localRow.raw_input,
          requested_start_date: localRow.requested_start_date,
          lat: localResult.location?.lat,
          lon: localResult.location?.lon,
          isLocal: true,
        });
        return;
      }

      const data = await getWeatherRequest(id, userId);
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

  const makeDateReadable = (dateStr) => {
    if (!dateStr) return null;
    
    // Check if it's an ISO timestamp (contains 'T')
    if (dateStr.includes('T')) {
      // Parse ISO timestamp and convert to local timezone
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return dateStr;
      return d.toLocaleString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Otherwise, treat as date-only string (YYYY-MM-DD)
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  const handleEditFromView = (id) => {
    if (!viewData) return;
    if (viewData.isLocal) {
      setError('Editing local history requires signing in and syncing results first.');
      return;
    }
    setEditingId(id);
    setEditForm({ ...viewData });
    setViewingId(null);
    setViewData(null);
  };

  const handleSaveEdit = async (editData) => {
    if (!editingId) return;
    setError(null);
    try {
      setSuccessMessage('');
      sessionStorage.removeItem('history.success');
      const { selectedDate, temperatureUnit, notes } = editData;
      
      // Call backend to update with the selected date, unit, and notes
      await updateWeatherRequest(editingId, {
        selectedDate,
        units: temperatureUnit === 'F' ? 'imperial' : 'metric',
        notes: notes || undefined,
      }, userId);
      
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
      setSuccessMessage('');
      sessionStorage.removeItem('history.success');
      const localRow = items.find((row) => row.id === id && row.__local);
      if (localRow?.__localItem) {
        removePendingWeatherResult(localRow.__localItem);
        load();
        return;
      }

      await deleteWeatherRequest(id, userId);
      load();
    } catch (err) {
      setError(err.message || 'Failed to delete.');
    }
  };

  const handleExport = async (format) => {
    if (!userId) {
      setError('Sign in to export your saved account history.');
      return;
    }

    const fmt = format || exportFormat;
    setError(null);
    try {
      const { blob, filename } = await downloadExport(fmt, {}, userId);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(err.message || 'Failed to export.');
    }
  };

  return (
    <div className="history-view">
      <h2>Saved weather requests</h2>
      <p className="history-desc">View, delete, or export your saved requests. Click View to edit.</p>

      <div className="export-panel">
        {userId ? (
          <>
            <label>
              Export format
              <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="md">Markdown</option>
                <option value="pdf">PDF</option>
              </select>
            </label>
            <button type="button" className="btn btn-primary" onClick={() => handleExport()}>
              Download export
            </button>
          </>
        ) : <span className="export-note">Sign in to save your searches</span>}

        <button type="button" className="btn btn-secondary toggle-global-btn" onClick={handleToggleGlobalResults}>
          {showGlobalResults ? 'Location Queries' : 'Global Results'}
        </button>
      </div>

      {successMessage && <p className="success-banner">{successMessage}</p>}
      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {loading ? (
        <p className="loading-state">Loading…</p>
      ) : showGlobalResults ? (
        <div className="global-results-panel">
          {globalItems.length === 0 ? (
            <p className="empty-state">No global search data available yet.</p>
          ) : (
            <>
              <h3>Top global location queries</h3>
              <div className="global-summary">
                <span className="global-metric">Total queries: {globalSummary.totalQueries}</span>
                <span className="global-metric">Last updated: {globalSummary.lastUpdatedText}</span>
              </div>
              <div className="global-chart">
                {globalItems.map((row, index) => {
                  const ratio = Math.max(5, Math.round(((Number(row.search_count) || 0) / maxGlobalCount) * 100));
                  const label = row.normalized_name || row.raw_input || `Location #${row.location_id}`;
                  return (
                    <div className="global-bar-row" key={`${row.location_id}-${index}`}>
                      <div className="global-row-head">
                        <span className="global-label">{index + 1}. {label}</span>
                        <span className="global-count">{row.search_count}</span>
                      </div>
                      <div className="global-bar-track">
                        <div className="global-bar-fill" style={{ width: `${ratio}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : items.length === 0 ? (
        <p className="empty-state">No saved requests yet. Use the Search page to get weather and save it.</p>
      ) : (
        <div className="history-list">
          {items.map((row) => (
            <div key={row.id} className="history-card">
              <div className="history-card-main">
                <strong>{row.normalized_name || row.raw_input}</strong>
                {row.country_code && <span> ({row.country_code ? regionNames.of(row.country_code) : null})</span>}
                <div className="history-meta">
                  {row.current_temp != null ? Math.round(row.current_temp) : 'N/A'}°{row.temperature_unit} on {makeDateReadable(row.requested_start_date)} · {row.updated_at !== row.created_at ? 'Updated ' : 'Saved '} {makeDateReadable(row.updated_at || row.created_at)}
                </div>
              </div>
              <div className="history-actions">
                <button type="button" className="btn btn-small" onClick={() => handleView(row.id)}>View</button>
                {userId && <button type="button" className="btn btn-small" onClick={() => handleExport(exportFormat)}>Export</button>}
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
