# Environment Configuration Guide

## Frontend Setup

### Local Development (.env.local)

```dotenv
VITE_API_URL=/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

- Uses Vite's built-in proxy (configured in vite.config.js)
- Proxies /api requests to <http://localhost:3001>

### Production Deployment (.env)

Set before building:

```dotenv
VITE_API_URL=https://your-api-domain.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

- Replace `your-api-domain.com` with your actual API server domain
- Backend server should be running on that domain
- Example: `VITE_API_URL=https://api.weather-app.com`

## Backend Setup

### Local Development (.env)

```dotenv
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your_supabase_secret_key
OPENWEATHER_API_KEY=your_openweather_key
```

### Production Deployment

Deploy with the same environment variables wherever you host the backend.
The frontend must also include the Supabase URL/publishable key so users can sign in/sign up.

## How It Works

1. **Local Development**: Frontend (port 5173 or 5174) → Vite proxy → Backend (port 3001)
   - No need to set VITE_API_URL explicitly (defaults to /api)

2. **Production**: Frontend (static files) → API requests → Backend (production domain)
   - VITE_API_URL must be set to the production API domain
   - Build the frontend with: `npm run build`
   - Deploy to static hosting (Netlify, Vercel, etc.)

## Testing

### Local (Both running)

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2  
cd frontend && npm run dev
```

Access: <http://localhost:5173> or <http://localhost:5174>

### API Health Check

```bash
curl http://localhost:3001/api/health
# Output: {"status":"ok"}
```

### Full Request Test

```bash
# POST new weather request
curl -X POST http://localhost:3001/api/weather-requests \
  -H "Content-Type: application/json" \
  -d '{"locationInput":"Paris","locationType":"city","startDate":"2026-02-24","endDate":"2026-02-28","units":"metric"}'
```
