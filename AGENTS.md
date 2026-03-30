# Monolog

Monolog is a quiet writing surface where posts are read by AI personas that leave threaded comments. The product pairs a React (Vite) frontend with a FastAPI backend, Supabase for auth, and PostgreSQL for app data.

## Tech Stack

- **Frontend**: TypeScript, React 19, Vite 6, React Router 7, Tailwind CSS 4, Supabase JS client
- **Backend**: Python, FastAPI, SQLAlchemy 2, psycopg (PostgreSQL)
- **Auth**: Supabase Auth; API requests use `Authorization: Bearer <access_token>` (JWT validated via JWKS)
- **Database**: PostgreSQL (URL via `DATABASE_URL`)

## Directory Structure

```
backend/app/          # FastAPI app: features/* (posts, settings, personas, auth), shared/*
frontend/src/         # React app: features/*, shared/*
docs/                 # Detailed docs (API, DB, design, frontend)
```

## Documentation Navigation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Domains, layers, and data flow |
| [docs/API.md](docs/API.md) | REST API base URL, auth, errors, and endpoint reference |
| [docs/DATABASE.md](docs/DATABASE.md) | PostgreSQL tables aligned with SQLAlchemy models |
| [docs/DESIGN.md](docs/DESIGN.md) | Design system: tokens, typography, components |
| [docs/FRONTEND.md](docs/FRONTEND.md) | Frontend structure and API client usage |
| [docs/PLANS.md](docs/PLANS.md) | Planning conventions |
| [docs/design-docs/index.md](docs/design-docs/index.md) | Design documents index |
| [docs/product-specs/index.md](docs/product-specs/index.md) | Product specs index |

## Core Rules

1. **Auth on API**: All routes under `/api` except `/api/health` and `/health` require a valid Supabase JWT.
2. **JSON shapes**: Successful responses use camelCase for API field names where implemented (e.g. posts, personas); errors return `{"error": "<message>"}`.
3. **DB truth**: Schema changes belong in SQLAlchemy models (`backend/app/shared/models.py`); keep [docs/DATABASE.md](docs/DATABASE.md) in sync when tables change.
4. **Design tokens**: Prefer CSS variables and `@theme` colors in `frontend/src/styles/globals.css` over one-off hex values in components.
5. **Documentation**: Substantive feature or API changes should update the relevant file under `docs/` in the same change set when practical.
