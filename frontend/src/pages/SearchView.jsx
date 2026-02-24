import { useState, useEffect } from 'react';
import { createWeatherRequest } from '../api/client';
import LocationInput from '../components/LocationInput';
import WeatherSummaryCard from '../components/WeatherSummaryCard';
import ForecastList from '../components/ForecastList';
import ErrorBanner from '../components/ErrorBanner';
import './SearchView.css';

function getToday() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function getMaxDate() {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function enhanceErrorMessage(err, locationType, locationInput) {
  const baseMessage = err.message || 'Something went wrong. Please try again.';
  let suggestion = '';

  if (baseMessage.toLowerCase().includes('not found')) {
    if (locationType === 'zip') {
      suggestion = ' Try entering a city name instead, or use format: zipcode,countrycode (e.g., 10001,US).';
    } else if (locationType === 'coords') {
      suggestion = ' Use format: latitude,longitude (e.g., 40.7128,-74.0060). Coordinates must be between -90-90° latitude and -180-180° longitude.';
    } else {
      suggestion = ' Try being more specific (e.g., "London, UK") or use a zip code.';
    }
  } else if (baseMessage.toLowerCase().includes('invalid')) {
    if (locationType === 'coords') {
      suggestion = ' Please use format: latitude,longitude (e.g., 48.8566,2.3522).';
    } else if (locationType === 'zip') {
      suggestion = ' Please enter a valid zip code or postal code, optionally with country code.';
    }
  } else if (baseMessage.toLowerCase().includes('geolocation')) {
    suggestion = ' Enable location permissions in your browser settings, or enter a location manually.';
  } else if (baseMessage.toLowerCase().includes('temporarily unavailable') || baseMessage.toLowerCase().includes('502')) {
    suggestion = ' The weather service is temporarily unavailable. Please try again in a moment.';
  } else if (baseMessage.toLowerCase().includes('network')) {
    suggestion = ' Check your internet connection and try again.';
  }

  const additionalDetails = err.details && Array.isArray(err.details) 
    ? ' ' + err.details.map((d) => d.message || d).join(' ')
    : '';

  return baseMessage + suggestion + additionalDetails;
}

export default function SearchView() {
  const [locationInput, setLocationInput] = useState('');
  const [locationType, setLocationType] = useState('city');
  const [units, setUnits] = useState('metric');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [hasShownResults, setHasShownResults] = useState(false);

  // Load result from localStorage on mount
  useEffect(() => {
    const savedResult = localStorage.getItem('weatherResult');
    if (savedResult) {
      try {
        const parsed = JSON.parse(savedResult);
        setResult(parsed);
        setHasShownResults(true);
      } catch (e) {
        console.error('Failed to parse saved result:', e);
      }
    }
  }, []);

  // Save result to localStorage whenever it changes
  useEffect(() => {
    if (result) {
      localStorage.setItem('weatherResult', JSON.stringify(result));
    } else {
      localStorage.removeItem('weatherResult');
    }
  }, [result]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setHasShownResults(true);
    const input = locationInput.trim();
    if (!input) {
      setError('Please enter a location.');
      return;
    }
    setLoading(true);
    try {
      const data = await createWeatherRequest({
        locationInput: input,
        locationType,
        startDate: getToday(),
        endDate: getMaxDate(),
        units,
        notes: notes || undefined,
      });
      setResult(data);
    } catch (err) {
      const enhancedMessage = enhanceErrorMessage(err, locationType, input);
      setError(enhancedMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    setError(null);
    setHasShownResults(true);
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
          const data = await createWeatherRequest({
            locationInput: lat + ',' + lon,
            locationType: 'coords',
            startDate: getToday(),
            endDate: getMaxDate(),
            units,
            notes: notes || undefined,
          });
          setResult(data);
          setLocationInput(lat + ', ' + lon);
        } catch (err) {
          const enhancedMessage = enhanceErrorMessage(err, 'coords', `${lat}, ${lon}`);
          setError(enhancedMessage);
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError('🔒 Location access denied. Enable location permissions in your browser settings, or enter a location manually.');
        setLoading(false);
      },
      { timeout: 10000 }
    );
  };

  return (
    <div className="search-view">
      <h2>🌤️ Current weather and 5-day forecast</h2>
      <div className={`search-container ${hasShownResults ? 'with-results' : 'no-results'}`}>
        <form onSubmit={handleSubmit} className="search-form">
          <h3 className="form-title">📍 Find Weather</h3>
          <LocationInput
            value={locationInput}
            onChange={setLocationInput}
            locationType={locationType}
            onTypeChange={setLocationType}
          />
          <button type="button" className="btn btn-secondary" onClick={handleUseCurrentLocation} disabled={loading}>
            📍 Use current location
          </button>
          <div className="form-row">
            <label>
              🌡️ Unit
              <select value={units} onChange={(e) => setUnits(e.target.value)}>
                <option value="metric">Celsius (°C)</option>
                <option value="imperial">Fahrenheit (°F)</option>
              </select>
            </label>
            <label>
              📝 Notes (optional)
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Trip, vacation" />
            </label>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '⏳ Loading…' : '🔍 Get weather'}
          </button>
        </form>
        {result && (
          <div className="result-section">
            <WeatherSummaryCard
              location={result.request?.normalized_name || result.location?.normalized_name}
              country={result.request?.country_code || result.location?.country_code}
              current={result.current}
              unit={result.request?.temperature_unit || 'C'}
            />
            <ForecastList
              forecast={result.forecast || result.snapshots}
              unit={result.request?.temperature_unit || 'C'}
            />
            {result.location && (
              <div className="media-links">
                <a href={'https://www.google.com/maps?q=' + result.location.lat + ',' + result.location.lon} target="_blank" rel="noopener noreferrer">🗺️ View on Google Maps</a>
              </div>
            )}
          </div>
        )}
      </div>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
    </div>
  );
}
