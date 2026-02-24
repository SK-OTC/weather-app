export default function LocationInput({ value, onChange, locationType, onTypeChange }) {
  return (
    <div className="location-input">
      <label>
        Location type
        <select
          value={locationType}
          onChange={(e) => onTypeChange(e.target.value)}
          aria-label="Location type"
        >
          <option value="city">City / Town</option>
          <option value="zip">Zip / Postal code</option>
          <option value="coords">Coordinates (lat, lon)</option>
        </select>
      </label>
      <label>
        {locationType === 'coords' ? 'Latitude, longitude' : 'Location'}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            locationType === 'coords'
              ? 'e.g. 48.8566, 2.3522'
              : locationType === 'zip'
              ? 'e.g. 75001 or 75001, FR'
              : 'e.g. London or Paris'
          }
          aria-invalid={value.trim() && locationType === 'coords' && !/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(value.trim())}
        />
      </label>
    </div>
  );
}
