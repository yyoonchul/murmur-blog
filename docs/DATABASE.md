# Database Schema (PostgreSQL)

ORM definitions live in `backend/app/shared/models.py` (`Base` from `backend/app/shared/db.py`). Types below match SQLAlchemy columns; actual SQL types are PostgreSQL (e.g. `UUID`, `JSONB`, `TEXT[]`).

## Entity relationship (summary)

- `profiles` is the root user row (id = Supabase user UUID).
- `posts` and `comments` belong to a user and (for comments) to a post; comments may self-reference for threading (`parent_id` → `comments.id`, `ON DELETE SET NULL`).
- `user_settings`, `user_secrets`, `user_persona_state`, `user_persona_overrides` are keyed by `user_id` → `profiles.id` (`ON DELETE CASCADE`).
- `user_persona_overrides` composite PK `(user_id, persona_id)` with `persona_id` → `persona_library.id`.

## Tables

### `profiles`

| Column | Type | Notes |
|--------|------|--------|
| `id` | UUID | PK |
| `display_name` | TEXT | nullable |
| `created_at` | TIMESTAMP | server default `NOW()` |

### `persona_library`

Preset personas (shared catalog).

| Column | Type | Notes |
|--------|------|--------|
| `id` | VARCHAR | PK |
| `name`, `role`, `emoji` | TEXT | |
| `color`, `bg_color`, `border_color` | TEXT | API uses camelCase `bgColor`, `borderColor` |
| `prompt_file` | TEXT | |
| `description` | TEXT | default `''` |
| `prompt_content` | TEXT | |

### `user_settings`

| Column | Type | Notes |
|--------|------|--------|
| `user_id` | UUID | PK, FK → `profiles.id` CASCADE |
| `provider` | TEXT | default `'anthropic'` |
| `model` | TEXT | nullable |
| `provider_models` | JSONB | default `{}` |
| `custom_models` | JSONB | default structure with anthropic/openai/google arrays |
| `updated_at` | TIMESTAMP | default `NOW()` |

### `user_secrets`

| Column | Type | Notes |
|--------|------|--------|
| `user_id` | UUID | PK, FK → `profiles.id` CASCADE |
| `ciphertext` | TEXT | encrypted secrets blob |
| `updated_at` | TIMESTAMP | default `NOW()` |

### `user_persona_state`

| Column | Type | Notes |
|--------|------|--------|
| `user_id` | UUID | PK, FK → `profiles.id` CASCADE |
| `feedback_order` | TEXT[] | default empty array |
| `feedback_order_reason` | TEXT | default `''` |
| `active_persona_ids` | TEXT[] | default empty array |

### `user_persona_overrides`

Per-user overrides for a library persona.

| Column | Type | Notes |
|--------|------|--------|
| `user_id` | UUID | PK (part), FK → `profiles.id` CASCADE |
| `persona_id` | VARCHAR | PK (part), FK → `persona_library.id` CASCADE |
| `name`, `role`, `emoji`, `color`, `bg_color`, `border_color`, `prompt_content` | TEXT | nullable — null means “use library default” |

### `posts`

| Column | Type | Notes |
|--------|------|--------|
| `id` | UUID | PK, default gen |
| `user_id` | UUID | FK → `profiles.id` CASCADE |
| `title`, `content` | TEXT | |
| `created_at`, `updated_at` | TIMESTAMP | default `NOW()` |

### `comments`

| Column | Type | Notes |
|--------|------|--------|
| `id` | UUID | PK, default gen |
| `post_id` | UUID | FK → `posts.id` CASCADE |
| `user_id` | UUID | FK → `profiles.id` CASCADE |
| `persona_id` | TEXT | e.g. library id or `"user"` |
| `content` | TEXT | |
| `parent_id` | UUID | nullable, FK → `comments.id` ON DELETE SET NULL |
| `created_at` | TIMESTAMP | default `NOW()` |

---

Migrations: if the project adds Alembic or SQL migration files, reference them here. Until then, schema changes are applied to the database to match these models.
