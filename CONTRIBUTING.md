# Contributing to Monolog

Monolog에 기여해 주셔서 감사합니다! 이 문서는 프로젝트에 기여하기 위한 가이드라인을 제공합니다.

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

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API key
```

또는 앱 실행 후 Settings 페이지에서 API 키를 설정할 수 있습니다.

### 4. Run Development Server

```bash
npm run dev
```

http://localhost:3001 에서 앱이 실행됩니다.

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

- **TypeScript**: 모든 코드는 TypeScript로 작성
- **ES Modules**: `import`/`export` 사용
- **Functional Components**: React 함수형 컴포넌트 사용
- 기존 코드 패턴을 따라주세요

### Type Checking

```bash
npm run build  # TypeScript 에러 확인
```

## Pull Request Process

1. Feature branch 생성: `git checkout -b feature/your-feature-name`
2. 변경 사항 커밋
3. 빌드 확인: `npm run build`
4. Pull Request 생성
5. 명확한 설명 작성

## Adding a New Persona

1. `server/data/persona/library/`에 Markdown 파일 생성
2. `server/data/persona/library/library.json`에 메타데이터 추가

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

1. `server/lib/llm/`에 새 파일 생성 (예: `newprovider.ts`)
2. `LLMProvider` 인터페이스 구현:

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

3. `server/lib/llm/index.ts`에 등록
4. Settings에 API 키 처리 추가

## Questions?

이슈를 열어 질문하거나 토론해 주세요.
