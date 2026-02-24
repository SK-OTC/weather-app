const ICON_BASE = 'https://openweathermap.org/img/wn';

export default function WeatherSummaryCard({ location, country, current, unit }) {
  if (!current) return null;
  const symbol = unit === 'F' ? '°F' : '°C';
  const icon = current.icon ? `${ICON_BASE}/${current.icon}@2x.png` : null;
  const countryName = country ? new Intl.DisplayNames(['en'], { type: 'region' }).of(country) : null;
  return (
    <section className="weather-summary-card" aria-label="Current weather">
      <h3>{[location, countryName].filter(Boolean).join(', ')}</h3>
      <div className="current-main">
        {icon && <img src={icon} alt="" className="weather-icon" />}
        <div>
          <span className="temp">{Math.round(current.temp)}{symbol}</span>
          <span className="description">{current.description || '—'}</span>
        </div>
      </div>
      <dl className="current-details">
        <div><dt>Feels like</dt><dd>{Math.round(current.feels_like)}{symbol}</dd></div>
        <div><dt>High / Low</dt><dd>{Math.round(current.temp_max)}{symbol} / {Math.round(current.temp_min)}{symbol}</dd></div>
        {current.humidity != null && <div><dt>Humidity</dt><dd>{current.humidity}%</dd></div>}
        {current.wind_speed != null && <div><dt>Wind</dt><dd>{current.wind_speed} m/s</dd></div>}
        {current.pressure != null && <div><dt>Pressure</dt><dd>{current.pressure} hPa</dd></div>}
      </dl>
    </section>
  );
}
