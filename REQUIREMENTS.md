# Requirements – Libraries & Packages

Install dependencies separately for backend and frontend.

---

## Backend (`backend/`)

From the project root:

```bash
cd backend
npm install
```

### Dependencies (production)

| Package   | Version | Purpose                    |
|-----------|---------|----------------------------|
| axios     | ^1.6.2  | HTTP client for weather API |
| cors      | ^2.8.5  | CORS middleware            |
| dotenv    | ^16.3.1 | Load `.env` variables      |
| express   | ^4.19.2 | Web server (patched for known CVEs) |
| pg        | ^8.11.3 | PostgreSQL client          |
| zod       | ^3.22.4 | Request/validation schemas |
| pdf-lib   | ^1.17.1 | PDF generation (export)    |

### Backend – full list (copy-paste)

```
axios@^1.6.2
cors@^2.8.5
dotenv@^16.3.1
express@^4.19.2
pg@^8.11.3
zod@^3.22.4
pdf-lib@^1.17.1
```

---

## Frontend (`frontend/`)

From the project root:

```bash
cd frontend
npm install
```

### Dependencies (production)

| Package          | Version | Purpose           |
|------------------|---------|-------------------|
| react            | ^18.2.0 | UI library        |
| react-dom        | ^18.2.0 | React DOM renderer |
| react-router-dom | ^6.20.0 | Routing           |

### Dev dependencies

| Package             | Version | Purpose              |
|---------------------|---------|----------------------|
| @vitejs/plugin-react | ^4.2.0 | Vite React support   |
| vite                | ^5.0.0  | Build tool & dev server |

### Frontend – full list (copy-paste)

**Production:**

```
react@^18.2.0
react-dom@^18.2.0
react-router-dom@^6.20.0
```

**Dev:**

```
@vitejs/plugin-react@^4.2.0
vite@^5.0.0
```

---

## One-time install (both apps)

From the project root:

```bash
cd backend && npm install && cd ..
cd frontend && npm install
```

The canonical source of truth for versions is `backend/package.json` and `frontend/package.json`; this file is a readable summary. Run `npm install` in each directory to install the exact versions resolved by npm.
