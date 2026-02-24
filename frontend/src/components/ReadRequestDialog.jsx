import './EditRequestDialog.css';

function formatDateString(dateStr) {
  if (!dateStr) return 'N/A';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return 'N/A';
  try {
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function ReadRequestDialog({ data, onEdit, onClose }) {
  const unitSymbol = data.temperature_unit === 'F' ? '°F' : '°C';

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="read-dialog-title">
      <div className="dialog-box">
        <h3 id="read-dialog-title">{data.locationName || data.raw_input}</h3>
        <div className="read-dialog-content">
          <label>
            <span className="label-text">{data.current_temp ? `Temperature on ${formatDateString(data.requested_start_date)}` : 'Temperature'}</span>
            <p className="read-field">{data.current_temp ? `${Math.round(data.current_temp)}${unitSymbol}` : 'N/A'}</p>
          </label>
          <label>
            <span className="label-text">Notes</span>
            <p className="read-field">{data.notes || 'N/A'}</p>
          </label>
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onEdit}>Edit</button>
          <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
