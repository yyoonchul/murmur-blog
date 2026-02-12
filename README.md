# Monolog

<!-- TODO: YOUR_USERNAME을 실제 GitHub 사용자명으로 변경하세요 -->

<p align="center">
  <img src="public/demo.gif" alt="Monolog Demo" width="700">
</p>

> A quiet blog where AI personas read your posts and leave thoughtful comments.

## Why Monolog?

글을 쓰고 나면 누군가의 반응이 궁금합니다. 하지만 공개하기엔 아직 다듬어지지 않은 생각들...

Monolog는 이런 순간을 위해 만들어졌습니다:

- 공개 전에 다양한 관점의 피드백을 받고 싶을 때
- 혼자 쓰지만 대화하듯 글을 발전시키고 싶을 때
- 내 글의 논리적 허점이나 보완점을 찾고 싶을 때

5명의 AI 페르소나가 각자의 관점에서 당신의 글을 읽고 생각을 남깁니다.

## Features

- **AI-Powered Feedback**: Multiple AI personas provide diverse perspectives on your writing
- **Persona Library**: Choose from 15+ preset personas or customize your own
- **Multi-LLM Support**: Use Claude, GPT-4, or Gemini as your AI backend
- **Local-First**: All data stored locally; your writing stays on your machine
- **Markdown Editor**: Write in Markdown with live preview

## Quick Start

### Prerequisites

- Node.js 18+
- API key from one of:
  - [Anthropic](https://console.anthropic.com/) (Claude)
  - [OpenAI](https://platform.openai.com/) (GPT-4)
  - [Google AI](https://aistudio.google.com/) (Gemini)

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/monolog.git
cd monolog
npm install
```

### Configuration

API 키 설정 방법은 2가지입니다:

**Option 1: Settings UI (Recommended)**

1. Run `npm run dev`
2. Open http://localhost:3001
3. Go to Settings and add your API key

**Option 2: Environment File**

```bash
cp .env.example .env
# Edit .env with your API key
```

### Run

```bash
npm run dev
```

Visit http://localhost:3001

## Configuration Files

| File | Purpose | How to Create |
|------|---------|---------------|
| `.env` | API keys (env var method) | Copy from `.env.example` |
| `server/data/settings.json` | App settings | Auto-generated via Settings UI |
| `server/data/posts/` | Your blog posts | Auto-generated when writing |
| `server/data/persona/` | Persona configs | Pre-configured, customizable |

> **Note**: You only need to configure ONE of `.env` or `settings.json`.
> Using the Settings UI is recommended for easier setup.

## Personas

### Built-in Personas

Monolog comes with 5 built-in personas:

| Persona | Role | Focus |
|---------|------|-------|
| Mina | First Reader | Emotional connection, what resonated |
| Eunseo | Writing Fellow | Voice, compelling sentences, flow |
| Jihoon | Practical Mentor | Reality-checking, execution feasibility |
| Suhyun | Argument Critic | Logical weak points, hidden premises |
| Doyun | Contrarian | Opposite arguments, consensus-checking |

### Persona Library

15+ additional personas available in the library:

- **Philosopher** - Deep questions about meaning and assumptions
- **Scientist** - Evidence-based analysis and methodology
- **Poet** - Rhythm, imagery, and emotional truth
- **Skeptic** - Challenges claims and asks for proof
- And more...

### Custom Personas

Create your own persona by adding a markdown file to `server/data/persona/`.
See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │   Home   │ │  Editor  │ │ PostView │ │ Settings │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │ API
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Express)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    LLM Providers                      │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐               │   │
│  │  │ Claude  │  │ OpenAI  │  │ Gemini  │               │   │
│  │  └─────────┘  └─────────┘  └─────────┘               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │ File I/O
┌─────────────────────────────────────────────────────────────┐
│                    Local Storage                             │
│  server/data/                                                │
│  ├── posts/       # Blog posts (Markdown + metadata)        │
│  ├── persona/     # Persona configurations                   │
│  └── settings.json                                          │
└─────────────────────────────────────────────────────────────┘
```

## API Reference

### Posts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts` | List all posts |
| GET | `/api/posts/:id` | Get single post |
| POST | `/api/posts` | Create post |
| PUT | `/api/posts/:id` | Update post |
| DELETE | `/api/posts/:id` | Delete post |

### Comments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/posts/:id/comments` | Add comment |
| POST | `/api/posts/:id/comments/generate` | Generate AI comments |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get settings |
| PUT | `/api/settings` | Update settings |

### Personas

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/personas` | Get active personas |
| PUT | `/api/personas` | Update personas |
| GET | `/api/personas/library` | Get persona library |
| POST | `/api/personas/add` | Add persona from library |
| DELETE | `/api/personas/:id` | Remove persona |

## Tech Stack

- [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Express](https://expressjs.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
