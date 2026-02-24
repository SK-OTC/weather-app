import { useState } from 'react';
import { getToday, getMaxDate } from '../utils/dateUtils';
import './EditRequestDialog.css';

export default function EditRequestDialog({ initial, onSave, onClose, snapshots, locationName }) {
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [temperatureUnit, setTemperatureUnit] = useState(initial.temperature_unit || 'C');
  const [notes, setNotes] = useState(initial.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const unitSymbol = temperatureUnit === 'F' ? '°F' : '°C';

  // Check if selected date has snapshot data
  const selectedSnapshot = snapshots?.find((s) => s.snapshot_date === selectedDate);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSave({
        selectedDate,
        selectedSnapshot,
        temperatureUnit,
        notes,
      });
    } catch (err) {
      setError(err.message || 'Failed to save.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="edit-dialog-title">
      <div className="dialog-box">
        <h3 id="edit-dialog-title">Select forecast date for {locationName}</h3>
        <form onSubmit={handleSubmit}>
          <label>
            Forecast date (today to 5 days from now)
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={getToday()}
              max={getMaxDate()}
              required
            />
          </label>
          <label>
            Temperature Unit
            <select value={temperatureUnit} onChange={(e) => setTemperatureUnit(e.target.value)}>
              <option value="C">Celsius (°C)</option>
              <option value="F">Fahrenheit (°F)</option>
            </select>
          </label>
          <label>
            Notes
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Trip, vacation" />
          </label>

          {selectedSnapshot ? (
            <div className="forecast-info">
              <p>
                <strong>Temperature available:</strong> {selectedSnapshot.temp_min}
                {unitSymbol} ~ {selectedSnapshot.temp_max}
                {unitSymbol}
              </p>
              <p className="info-text">(Using saved forecast data)</p>
            </div>
          ) : null}

          {error && <p className="inline-error" role="alert">{error}</p>}
          <div className="dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Updating…' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
