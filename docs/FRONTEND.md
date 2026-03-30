# Frontend Guide

## Stack

TypeScript, React 19, Vite 6, React Router 7, Tailwind CSS 4 (`@import "tailwindcss"` in `globals.css`), Supabase client for auth.

## Directory layout

- `frontend/src/features/` — feature modules: `auth`, `landing`, `posts`, `settings`, `personas`
- `frontend/src/shared/` — `components/`, `lib/` (`apiClient.ts`, `supabase.ts`)

## API calls

Use `apiFetch` from `shared/lib/apiClient.ts` for authenticated Monolog API access. Paths omit the `/api` prefix (it is added automatically). Session token is read from Supabase (`getSession()`).

## Styling

Global styles and design tokens: `src/styles/globals.css` (imported from app entry). See [DESIGN.md](DESIGN.md) for the design system.

## Routing

App routes are defined in `src/App.tsx`: guests see `landing` + `/login` (Google OAuth); signed-in users get the blog shell (`/`, `/post/:id`, `/write`, `/edit/:id`, `/settings`).

## Types

Feature-specific TypeScript types live under each feature’s `model/` or co-located with API modules (e.g. `features/posts/model/types.ts`).
