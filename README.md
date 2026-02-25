# Weather App 

## Prerequisites
- Node.js 18+
- PostgreSQL (local or remote)
- [OpenWeatherMap](https://openweathermap.org/api) API key (free tier is enough)

## Requirements
See [REQUIREMENTS.md](REQUIREMENTS.md) for a complete list of npm packages and versions needed for backend and frontend.

## How to run repo locally:
Clone this repository then enter the following (down below) in your terminal >>

**Install Packages:**

```bash
cd backend && npm install && cd ..
cd frontend && npm install
```

## Start the weather-app

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
# Edit .env: set DATABASE_URL and OPENWEATHER_API_KEY
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

## API summary

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/weather-requests` | Create request (body: locationInput, locationType, startDate, endDate, units, notes) |
| GET | `/api/weather-requests` | List (query: locationName, startDate, endDate, limit, offset) |
| GET | `/api/weather-requests/:id` | Get one with snapshots |
| PUT | `/api/weather-requests/:id` | Update (startDate, endDate, units, notes) |
| DELETE | `/api/weather-requests/:id` | Delete |
| GET | `/api/export` | Export (query: format=json|csv|md|pdf) |
