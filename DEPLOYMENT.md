# Deploying Monolog (Vercel + Railway + Supabase)

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Create the database schema in the SQL Editor (or your own migration workflow) so it matches [backend/app/models.py](backend/app/models.py) — tables such as `profiles`, `user_settings`, `user_secrets`, `persona_library`, `posts`, `comments`, plus an `on_auth_user_created` trigger that seeds default rows for new users.
3. Enable **Email** auth (magic link) under Authentication → Providers.
4. Add your **Site URL** and **Redirect URLs** (e.g. `https://your-app.vercel.app` and `http://localhost:5173` for dev).
5. Seed `persona_library` (and any defaults) as needed for your app.
6. Copy **Project URL**, **anon key**, and a **database connection string** (direct or pooler session mode per [Supabase connection docs](https://supabase.com/docs/guides/database/connecting-to-postgres)).

## 2. Railway (API)

1. New service from this repo; set **Root Directory** to `backend`.
2. Set variables from [backend/.env.example](backend/.env.example): `DATABASE_URL`, `SUPABASE_JWKS_URL`, `FERNET_KEY`, `CORS_ORIGINS` (include your Vercel production and preview URLs).
3. **Generate domain** under Networking so you have a public API URL.
4. Start command is defined in [backend/railway.toml](backend/railway.toml) (`uvicorn` on `$PORT`).

## 3. Vercel (web)

1. Import the repo; set **Root Directory** to `frontend`.
2. Environment variables from [frontend/.env.example](frontend/.env.example): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL` (Railway API URL, no trailing slash).

## 4. Smoke test

- Open the Vercel URL, sign in with email, open Settings → Providers, save an API key (requires `FERNET_KEY` on Railway).
- Create a post and confirm AI comments run (requires valid LLM key and model).
