## How to Deploy

### Step 1: Build Frontend
```bash
cd frontend
VITE_API_URL=https://your-api-domain.com npm run build
```

### Step 2: Deploy Backend
```bash
# Your backend server (e.g., Heroku, Railway, Render, etc.)
# Set environment variables:
SUPABASE_URL=...
SUPABASE_API_KEY=...
OPENWEATHER_API_KEY=...
PORT=3001
```

### Step 3: Deploy Frontend
```bash
# Static hosting (e.g., Netlify, Vercel, GitHub Pages)
# Upload the `dist/` folder
```
