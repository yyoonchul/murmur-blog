# Contributing to Monolog

Thank you for contributing to Monolog! This document provides guidelines for contributing to the project.

## Getting Started

### 1. Fork & Clone

```bash
git clone https://github.com/YOUR_USERNAME/monolog.git
cd monolog
```

### 2. Install dependencies

**Frontend**

```bash
cd frontend
npm install
```

**Backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure Supabase & env

1. Create a Supabase project and apply a Postgres schema consistent with [backend/app/models.py](backend/app/models.py) (SQL Editor, Supabase CLI, or external migrations — this repo does not ship SQL migration files).
2. Copy [backend/.env.example](backend/.env.example) → `backend/.env` and [frontend/.env.example](frontend/.env.example) → `frontend/.env.local`.
3. Fill in `DATABASE_URL`, `SUPABASE_JWKS_URL`, `FERNET_KEY`, and the `VITE_*` variables.

### 4. Run locally

**Terminal A — API**

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal B — Web**

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 and sign in with email. Vite proxies `/api` to port 8000.

## Project structure

```
monolog/
├── frontend/                 # React + Vite
│   ├── src/
│   │   ├── auth/             # Auth context
│   │   ├── components/
│   │   ├── lib/              # Supabase client, apiFetch
│   │   ├── pages/
│   │   ├── services/         # api.ts
│   │   └── types/
│   ├── public/
│   └── vercel.json           # SPA rewrites
├── backend/                  # FastAPI
│   └── app/
│       ├── routers/
│       ├── services/
│       └── llm/              # Provider implementations
```

## Code style

- **TypeScript**: Frontend uses strict TypeScript; follow existing patterns.
- **Python**: Backend uses type hints; match `app/` layout and keep routes thin.
- **ES Modules** in frontend; **functional** React components.

### Checks

```bash
cd frontend && npm run build    # Typecheck + Vite build
```

## Pull request process

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Commit your changes
3. Verify `frontend` build (and manually exercise API changes if you touch `backend/`)
4. Open a PR with a clear description

## Adding a new persona (library preset)

1. Insert or update rows in the `persona_library` table in Supabase (include `prompt_content` text) so they match what the UI expects.
2. Keep IDs stable; the frontend references persona `id` strings.

### Persona prompt format

```markdown
You are **Name**, a [role description]. You approach writing with [perspective].

## Personality and Tone

- [Trait 1]
- [Trait 2]

## Feedback Focus

1. **Area 1** — Description

## Response Format

- 3-5 sentences of feedback
- Responds in the same language as the post
```

## Adding a new LLM provider

1. Add a provider class in [backend/app/llm/providers.py](backend/app/llm/providers.py) (follow `ClaudeProvider` / `OpenAIProvider` / `GeminiProvider`).
2. Register it in `_PROVIDERS` and extend `ProviderType` in [backend/app/llm/types.py](backend/app/llm/types.py).
3. Add UI key name and provider entry in [frontend/src/pages/Settings.tsx](frontend/src/pages/Settings.tsx) (`PROVIDERS` list).

## Questions?

Please open an issue to ask questions or start a discussion.
