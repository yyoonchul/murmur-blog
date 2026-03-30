# Monolog REST API

Canonical implementation: `backend/app/main.py` and routers under `backend/app/features/*/api.py`.

## Base URL & versioning

- **Prefix**: All application routes are mounted under `/api` (e.g. `/api/posts`).
- **Health** (no auth): `GET /api/health`, `GET /health` — return status payloads (see `main.py`).
- **OpenAPI**: FastAPI serves interactive docs at `/docs` when the server is running.

## Authentication

- **Header**: `Authorization: Bearer <supabase_access_token>`.
- **Validation**: RS256/ES256 JWT, audience `authenticated`, signing keys from `SUPABASE_JWKS_URL` (`backend/app/features/auth/jwt.py`).
- **User identity**: JWT `sub` is parsed as a UUID and used as `user_id` for all data access.
- **Bootstrap**: First authenticated request ensures related DB rows exist (`ensure_user_rows` in `backend/app/shared/user_bootstrap.py`).

## Client usage (frontend)

`frontend/src/shared/lib/apiClient.ts` — `apiFetch(path, init)`:

- `path` is relative to `/api` (e.g. `"/posts"`, `"/settings"`).
- Base URL: `import.meta.env.VITE_API_BASE_URL` with trailing slash stripped; if unset, same-origin `/api`.

## Error responses

`HTTPException` handlers return JSON:

```json
{ "error": "<string message>" }
```

Common status codes: `401` (missing/invalid token), `400` (validation), `404` (not found or not owned), `409` (conflict), `500`/`503` (server / configuration).

---

## Endpoints

### Posts (`/api/posts`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/posts` | List current user’s posts (newest first). **Summary rows** — no `content` or `comments`; each item includes `commentCount`. |
| `GET` | `/posts/{post_id}` | Single post if owned by user. |
| `POST` | `/posts` | Create post. Body: `{ "title", "content" }`. `201`; triggers background initial comment generation. |
| `PUT` | `/posts/{post_id}` | Update post. Body: `{ "title", "content" }`. |
| `DELETE` | `/posts/{post_id}` | Delete post. Returns `{ "success": true }`. |
| `POST` | `/posts/{post_id}/comments` | Add comment. Body: `{ "personaId", "content", "parentId"? }` (`parentId` optional UUID string). Returns array of comment objects (user comment plus AI replies when `personaId === "user"`). `201`. |
| `POST` | `/posts/{post_id}/comments/generate` | Generate initial comments for empty post. `409` if comments already exist. Returns `{ "comments": [...] }`. |

**Post list item** (`GET /posts`, camelCase):

```json
{
  "id": "<uuid>",
  "title": "...",
  "createdAt": "<ISO8601 Z>",
  "updatedAt": "<ISO8601 Z>",
  "commentCount": 0
}
```

**Post detail response** (`GET`/`POST`/`PUT` single post, camelCase):

```json
{
  "id": "<uuid>",
  "title": "...",
  "content": "...",
  "createdAt": "<ISO8601 Z>",
  "updatedAt": "<ISO8601 Z>",
  "comments": [
    {
      "id": "<uuid>",
      "personaId": "...",
      "content": "...",
      "createdAt": "<ISO8601 Z>",
      "parentId": "<uuid optional>"
    }
  ]
}
```

### Settings (`/api/settings`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/settings` | Provider, models, masked API key names, etc. (see `build_settings_get_response`). |
| `PUT` | `/settings` | Update settings / secrets. Body keys include: `provider`, `model`, `providerModel` `{ provider, model }`, `apiKey`, `apiKeyName`, `deleteApiKey`, `renameFrom`, etc. Returns same shape as `GET`. |
| `POST` | `/settings/custom-models` | Body: `provider`, `modelId`, `modelName`, optional `description`. |
| `DELETE` | `/settings/custom-models/{provider}/{model_id}` | `model_id` may contain path segments (catch-all). |

### Personas (`/api/personas`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/personas` | `{ "personas", "feedbackOrder", "feedbackOrderReason" }` for active personas (presets + custom). |
| `PUT` | `/personas` | Body: `personas` array, `feedbackOrder`, `feedbackOrderReason`. Updates overrides (presets) or custom rows; sets active order. |
| `GET` | `/personas/library` | `{ "presets": [...] }` — full preset catalog with `isActive`, `description`, styling, `promptContent`. |
| `PUT` | `/personas/library/{persona_id}` | Update a **shared** library row (preset); response includes `isActive`. |
| `POST` | `/personas/add` | Body: `{ "personaId" }` — activate preset from library (`persona_library.id`). |
| `DELETE` | `/personas/{persona_id}` | Remove from active set. For presets, clears overrides for that id; does not delete custom rows. |
| `GET` | `/personas/custom` | `{ "customPersonas": [...] }` — all of the user’s custom personas with `isActive`. |
| `POST` | `/personas/custom` | Create custom persona. Body: `name` (required), `role`, `description`, `promptContent`, optional `emoji`, `color`, `bgColor`, `borderColor`. `201`. |
| `PUT` | `/personas/custom/{custom_id}` | Update custom persona (`custom_id` = UUID primary key, no `c:` prefix). |
| `DELETE` | `/personas/custom/{custom_id}` | Delete custom row and remove from active lists. |
| `POST` | `/personas/custom/add` | Body: `{ "personaId" }` — value is `c:<uuid>` or raw UUID string; adds that custom persona to the active set. |

**Persona id rules**

- Preset: string id from `persona_library` (e.g. `mina`).
- Custom: `c:` + UUID (e.g. `c:550e8400-e29b-41d4-a716-446655440000`).
- Human comment author in threads: `"user"`.

Persona objects use camelCase: `id`, `name`, `role`, `description` (one-line blurb), `emoji`, `color`, `bgColor`, `borderColor`, `promptFile`, `promptContent`, and when present `source` (`"preset"` \| `"custom"`).

---

When adding routes, update this file and [DATABASE.md](DATABASE.md) or [ARCHITECTURE.md](../ARCHITECTURE.md) if persistence or domain boundaries change.
