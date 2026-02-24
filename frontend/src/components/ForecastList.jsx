const ICON_BASE = 'https://openweathermap.org/img/wn';

function formatDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ForecastList({ forecast, unit }) {
  if (!forecast || !forecast.length) return null;
  const symbol = unit === 'F' ? '°F' : '°C';
  const items = forecast.slice(0, 5);
  return (
    <section className="forecast-list" aria-label="5-day forecast">
      <h3>5-day forecast</h3>
      <div className="forecast-grid">
        {items.map((day, i) => (
          <div key={day.date || i} className="forecast-item">
            <div className="forecast-day">{formatDay(day.snapshot_date || day.date)}</div>
            <div className="forecast-temps">
              {day.temp_min != null && <span>Min {Math.round(day.temp_min)}{symbol} </span>}
               -
              {day.temp_max != null && <span> Max {Math.round(day.temp_max)}{symbol}</span>}
            </div>
            <div className="forecast-desc">{day.description || '—'}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
