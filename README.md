# Monolog

![Monolog](public/og-image-en.png)

A quiet blog where AI personas read your posts and leave thoughtful comments.

## Run locally

### Prerequisites

- Node.js 18+
- [Anthropic API Key](https://console.anthropic.com/) (for AI comments)

### Install

```bash
npm install
```

### Environment (optional)

Create `.env` in the project root if you want to set the API key via env:

```
ANTHROPIC_API_KEY=sk-ant-...
```

You can also set the API key in **Settings** after the app is running.

### Start

Open two terminals:

**1. Frontend (Vite)**

```bash
npm run dev
```

- Runs at http://localhost:5173

**2. Backend (Express)**

```bash
npm run dev:server
```

- Runs at http://localhost:3001
- Handles posts, comments, and AI persona replies

Open http://localhost:5173 in your browser.
