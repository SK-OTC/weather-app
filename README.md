# Weather App (Full Stack)

A full-stack weather application that satisfies **Tech Assessment 1 (Frontend)** and **Tech Assessment 2 (Backend)**. Users can enter a location (city, zip, or coordinates), get current weather and a 5-day forecast, use their current location, and manage saved requests (CRUD). Data is persisted in PostgreSQL and can be exported in multiple formats.

## Assessments completed

- **Tech Assessment 1 (Frontend):** Implemented. The React app lets users enter location (city, zip, coordinates), shows current weather and 5-day forecast with responsive grid layout, supports "Use current location" (geolocation), includes emoji weather icons, and provides context-aware error handling with actionable suggestions. Mobile-first responsive design with multiple breakpoints and sticky sidebar layout on larger screens.
- **Tech Assessment 2 (Backend):** Implemented. Node/Express API with PostgreSQL: CRUD for weather requests with location validation, OpenWeatherMap integration, temperature unit conversion (C↔F), optional YouTube API and Google Maps links for locations, and data export (JSON, CSV, Markdown, PDF). Error handling returns structured `{ code, message, details }` with appropriate status codes. Request validation via Zod schemas.

## Prerequisites

- Node.js 18+
- PostgreSQL (local or remote)
- [OpenWeatherMap](https://openweathermap.org/api) API key (free tier is enough)
- Optional: YouTube Data API key for location videos (see backend `.env.example`)

## Requirements

See [REQUIREMENTS.md](REQUIREMENTS.md) for a complete list of npm packages and versions needed for backend and frontend.

**Quick install:**

```bash
cd backend && npm install && cd ..
cd frontend && npm install
```

**Check for vulnerabilities:** Run `npm run audit` (or `npm audit`) in both `backend/` and `frontend/` to list known security issues. Fix with `npm audit fix` when possible.

## Quick start

### 1. Database

Create a database and run the schema:

```bash
createdb weather_app
psql -d weather_app -f backend/migrations/001_schema.sql
```

Or with connection URL:

```bash
psql $DATABASE_URL -f backend/migrations/001_schema.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set DATABASE_URL and OPENWEATHER_API_KEY (and optionally YOUTUBE_API_KEY)
npm install
npm run dev
```

Server runs at `http://localhost:3001`. Health check: `GET /api/health`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173` and proxies `/api` to the backend.

## Environment variables (backend)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default 3001) |
| `DATABASE_URL` | Yes | PostgreSQL connection string (e.g. `postgresql://user:pass@localhost:5432/weather_app`) |
| `OPENWEATHER_API_KEY` | Yes | From [OpenWeatherMap](https://openweathermap.org/api) |
| `YOUTUBE_API_KEY` | No | For location videos on History/location media |

## Features

- **Location input:** City/town, zip/postal code, or coordinates (lat, lon). Location is validated and resolved via OpenWeatherMap geocoding.
- **Current weather + 5-day forecast:** From OpenWeatherMap; stored in DB with each request.
- **Use current location:** Browser geolocation; backend is called with coordinates.
- **History:** List, view, edit (date, units, notes), and delete saved requests.
- **Export:** Download all (or filtered) saved data as JSON, CSV, Markdown, or PDF (`GET /api/export?format=json|csv|md|pdf`). (Note: XML export was removed along with discontinued xml2js package)
- **Extra APIs:** Google Maps link for each location; YouTube videos for a location when `YOUTUBE_API_KEY` is set (`GET /api/locations/:id/media`).
- **Context-aware error messages:** Smart error detection and actionable suggestions based on location type and error category (e.g., "Try format: zipcode,countrycode" for zip errors).
- **Enhanced UI:** Emoji icons throughout (🌤️ weather, 📍 location, 🌡️ temperature, 📝 notes, 🔍 search, ⏳ loading, 🗺️ map), sticky search form sidebar on larger screens.

## Error handling

- **Backend:** Validation errors (400), location not found (404), upstream weather/API errors (502), and generic errors (500). Responses are `{ code, message, details }`. Zod is used for request validation.
- **Frontend:** Inline validation (e.g. date range), API error banner with message and dismiss, loading and empty states.

## Responsive design

- **Mobile-first CSS** with responsive breakpoints at 320px, 480px, 600px, 768px, 900px, and 1024px.
- **Flexbox and CSS Grid** for layout; touch-friendly button sizes (`min-height: 44px`).
- **SearchView layout:**
  - Mobile (< 768px): Stacked form and results
  - Tablet+ (768px+): 2-column sticky layout with form sidebar (`max-width: 320px`, `position: sticky`) and results area (`45-50%` flex-grow)
- **Forecast grid:** Single column on small screens, 2 columns at 600px+, 5 columns at 900px+.
- **Visual polish:** Gradient backgrounds, smooth transitions, box shadows, and emoji icons enhance usability.

## API summary

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/weather-requests` | Create request (body: locationInput, locationType, startDate, endDate, units, notes) |
| GET | `/api/weather-requests` | List (query: locationName, startDate, endDate, limit, offset) |
| GET | `/api/weather-requests/:id` | Get one with snapshots |
| PUT | `/api/weather-requests/:id` | Update (startDate, endDate, units, notes) |
| DELETE | `/api/weather-requests/:id` | Delete |
| GET | `/api/export` | Export (query: format=json|csv|xml|md|pdf) |
| GET | `/api/locations/:id/media` | YouTube videos + Google Maps URL for location |
