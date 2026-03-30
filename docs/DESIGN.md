# Design System — Monolog Web

**Source of truth (implementation)**: `frontend/src/styles/globals.css` and font imports in `frontend/index.html`.

## Principles

- **Editorial minimal**: Warm off-white page, high-contrast text, restrained accent (terracotta).
- **Typography-first**: Serif for display and article body; sans for UI chrome; mono for code.
- **Depth via restraint**: Surfaces use subtle borders and paper-like backgrounds rather than heavy shadows.

## CSS variables (`:root`)

| Token | Role |
|-------|------|
| `--bg-page` | Page background (`#F5F1EB`) |
| `--bg-surface` | Card/surface white |
| `--text-primary` / `--text-secondary` / `--text-muted` | Body hierarchy |
| `--accent` / `--accent-hover` | Links, emphasis, blockquote border |
| `--border-light` / `--border-dark` | Dividers and card borders |
| `--font-display` | Newsreader + Noto Serif KR + Georgia |
| `--font-body` | IBM Plex Sans + Pretendard + system sans |
| `--font-article` | Noto Serif KR + Newsreader + Georgia |
| `--font-mono` | IBM Plex Mono |
| `--max-width` | 640px (narrow content) |
| `--container-width` | 768px |
| `--padding-x` | Horizontal padding (24px; 16px on small screens) |

## Tailwind v4 theme (`@theme` in `globals.css`)

Semantic colors mirror the CSS variables for utility classes: `page`, `surface`, `primary`, `secondary`, `muted`, `accent`, `accent-hover`, `border-light`, `border-dark` (see `--color-*` entries in `globals.css`).

Prefer these over ad hoc hex in new components when Tailwind utilities are used.

## Typography utilities

- `.font-display`, `.font-body`, `.font-article`, `.font-mono` — map to the font stacks above.
- **Article content**: `.article-body` — serif size 16px, line-height ~1.85; styles for `p`, `h1–h3`, `code`, `pre`, `blockquote` (blockquote uses left accent border).

## Layout

- `.container-narrow` — centered column with `max-width: var(--max-width)` and horizontal padding.

## Components & patterns

| Class / pattern | Use |
|-----------------|-----|
| `.btn-primary` | Dark fill, light text, 6px radius |
| `.btn-secondary` | Transparent; hover darkens text |
| `.btn-accent` | Accent-colored text; underline on hover |
| `.text-accent` / `.bg-accent` | Accent color utilities |
| `.border-light` / `.border-dark` | Border color utilities |
| `.list-item-hover` | Transition to accent on hover |
| `.input-minimal` | Bottom-border-only input |
| `.comment-card` | Base card; modifiers `.comment-card--ai` (page bg + dark border), `.comment-card--user` (tinted bg + light border) |
| `.comment-markdown` | Compact markdown in comments (links use accent) |
| `.comment-thread` / `.nested-replies` | Thread layout and nesting |
| `.animate-fade-in`, `.animate-slide-up` | Entrance motion |
| `.accent-dot` | Pulsing dot for AI “typing” affordance |
| `.loading-dots` | Text ellipsis animation |

## External fonts

Loaded from Google Fonts in `index.html`: Newsreader, IBM Plex Sans, Noto Serif KR, IBM Plex Mono (weights as linked).

## When extending the system

1. Add or adjust tokens in `:root` and, if needed, duplicate under `@theme` for Tailwind.
2. Reuse existing button/input/card classes before introducing new visual patterns.
3. Keep persona-driven UI colors consistent with API fields `color`, `bgColor`, `borderColor` from persona objects where applicable.

Further UI structure and file layout: [FRONTEND.md](FRONTEND.md).
