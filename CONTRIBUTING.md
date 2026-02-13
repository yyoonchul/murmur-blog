# Contributing to Monolog

Thank you for contributing to Monolog! This document provides guidelines for contributing to the project.

## Getting Started

### 1. Fork & Clone

```bash
git clone https://github.com/YOUR_USERNAME/monolog.git
cd monolog
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure API Key

Run the app and set up your API key in the Settings page:

```bash
npm run dev
```

Then open http://localhost:3001 and go to **Settings** > **Providers** to add your API key.

### 4. Run Development Server

```bash
npm run dev
```

The app runs at http://localhost:3001.

## Project Structure

```
monolog/
├── src/                      # React Frontend
│   ├── components/           # Reusable UI components
│   │   ├── AiTypingIndicator.tsx
│   │   ├── CommentCard.tsx
│   │   ├── CommentInput.tsx
│   │   └── Header.tsx
│   ├── pages/                # Page components
│   │   ├── Home.tsx          # Post list
│   │   ├── Editor.tsx        # Post editor
│   │   ├── PostView.tsx      # Single post view
│   │   └── Settings.tsx      # Settings page
│   ├── services/
│   │   └── api.ts            # API client
│   └── types/
│       └── index.ts          # TypeScript interfaces
│
├── server/                   # Express Backend
│   ├── index.ts              # Server entry point
│   ├── routes/
│   │   └── posts.ts          # REST API routes
│   ├── lib/
│   │   ├── llm/              # LLM provider implementations
│   │   │   ├── types.ts      # Provider interface
│   │   │   ├── claude.ts     # Anthropic Claude
│   │   │   ├── openai.ts     # OpenAI GPT
│   │   │   └── gemini.ts     # Google Gemini
│   │   ├── settings.ts       # Settings management
│   │   ├── personas.ts       # Persona management
│   │   ├── comments.ts       # AI comment generation
│   │   └── commentsData.ts   # Comment file I/O
│   └── data/                 # Local data storage
│       ├── posts/            # Blog posts (Markdown + JSON)
│       ├── persona/          # Persona configs and prompts
│       │   └── library/      # Preset persona library
│       └── settings.json     # User settings
│
└── public/                   # Static assets
```

## Code Style

- **TypeScript**: All code should be written in TypeScript
- **ES Modules**: Use `import`/`export`
- **Functional Components**: Use React functional components
- Follow existing code patterns

### Type Checking

```bash
npm run build  # Check for TypeScript errors
```

## Pull Request Process

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Commit your changes
3. Verify build: `npm run build`
4. Create a Pull Request
5. Write a clear description

## Adding a New Persona

1. Create a Markdown file in `server/data/persona/library/`
2. Add metadata to `server/data/persona/library/library.json`

### Persona Prompt Format

```markdown
You are **Name**, a [role description]. You approach writing with [perspective].

## Personality and Tone

- [Trait 1]
- [Trait 2]
- [Trait 3]

## Feedback Focus

1. **Area 1** — Description
2. **Area 2** — Description
3. **Area 3** — Description

## Response Format

- 3-5 sentences of feedback
- [Specific instruction]
- Responds in the same language as the post
```

## Adding a New LLM Provider

1. Create a new file in `server/lib/llm/` (e.g., `newprovider.ts`)
2. Implement the `LLMProvider` interface:

```typescript
import type { LLMProvider, LLMOptions, LLMMessage, LLMModelInfo } from "./types.js";

export class NewProvider implements LLMProvider {
  name = "newprovider";

  getDefaultModel(): string { /* ... */ }
  getAvailableModels(): LLMModelInfo[] { /* ... */ }
  async sendMessage(userMessage: string, options?: LLMOptions): Promise<string> { /* ... */ }
  async sendConversation(messages: LLMMessage[], options?: LLMOptions): Promise<string> { /* ... */ }
}
```

3. Register it in `server/lib/llm/index.ts`
4. Add API key handling in Settings

## Questions?

Please open an issue to ask questions or start a discussion.
