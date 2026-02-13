# Monolog

> A quiet blog where AI personas read your posts and leave thoughtful comments.

## Why Monolog?

글을 쓰고 나면 누군가의 반응이 궁금합니다. 하지만 공개하기엔 아직 다듬어지지 않은 생각들...

Monolog는 이런 순간을 위해 만들어졌습니다:

- 공개 전에 다양한 관점의 피드백을 받고 싶을 때
- 혼자 쓰지만 대화하듯 글을 발전시키고 싶을 때
- 내 글의 논리적 허점이나 보완점을 찾고 싶을 때

5명의 AI 페르소나가 각자의 관점에서 당신의 글을 읽고 생각을 남깁니다.

## Features

- **AI-Powered Feedback** — 여러 AI 페르소나가 다양한 관점에서 글에 대한 피드백을 남김
- **Persona Library** — 15개 이상의 프리셋 페르소나 제공, 직접 커스터마이징 가능
- **Multi-LLM Support** — Claude, GPT, Gemini 중 원하는 모델 선택
- **Local-First** — 모든 데이터가 로컬에 저장, 글이 외부에 공유되지 않음
- **Markdown Editor** — 마크다운으로 작성하고 실시간 미리보기

## Quick Start

### 1. 준비사항

- **Node.js 18+** ([다운로드](https://nodejs.org/))
- **API Key** 하나 이상 (아래 중 하나):
  - [Anthropic](https://console.anthropic.com/) — Claude
  - [OpenAI](https://platform.openai.com/) — GPT
  - [Google AI Studio](https://aistudio.google.com/) — Gemini

### 2. 설치

```bash
git clone https://github.com/YOUR_USERNAME/monolog.git
cd monolog
npm install
```

### 3. 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3001 을 엽니다.

### 4. API 키 설정

1. 좌측 사이드바에서 **Settings** 클릭
2. **Providers** 탭에서 사용할 AI 프로바이더의 API Key를 입력하고 **Save**
3. 프로바이더를 클릭하여 **Active**로 설정

이것으로 설정 완료입니다. 글을 쓰면 AI 페르소나들이 자동으로 코멘트를 남깁니다.

> **참고**: API 키는 `server/data/settings.json`에 로컬 저장되며, `.gitignore`로 커밋에서 제외됩니다.

## Personas

### 기본 페르소나

| 페르소나 | 역할 | 관점 |
|---------|------|------|
| Mina | First Reader | 감정적 공감, 어떤 부분이 와닿았는지 |
| Eunseo | Writing Fellow | 문체, 문장력, 글의 흐름 |
| Jihoon | Practical Mentor | 현실성 검토, 실행 가능성 |
| Suhyun | Argument Critic | 논리적 허점, 숨은 전제 |
| Doyun | Contrarian | 반대 논거, 합의에 대한 의문 |

### 페르소나 라이브러리

Settings > Personas 탭에서 15개 이상의 추가 페르소나를 활성화/비활성화할 수 있습니다.

- **Philosopher** — 의미와 전제에 대한 깊은 질문
- **Scientist** — 증거 기반 분석과 방법론
- **Poet** — 리듬, 이미지, 감정의 진실
- **Skeptic** — 주장에 대한 검증 요구
- 그 외 다수...

### 커스텀 페르소나

`server/data/persona/` 디렉토리에 마크다운 파일을 추가하여 나만의 페르소나를 만들 수 있습니다.
자세한 내용은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

## Project Structure

```
monolog/
├── src/                    # Frontend (React + Vite)
│   ├── pages/              #   Home, Editor, PostView, Settings
│   ├── services/           #   API client
│   ├── styles/             #   Global styles
│   └── types/              #   TypeScript types
├── server/                 # Backend (Express)
│   ├── routes/             #   API routes
│   ├── lib/                #   Core logic (comments, personas, LLM)
│   │   └── llm/            #   LLM provider adapters (Claude, GPT, Gemini)
│   └── data/               #   Local data storage
│       ├── posts/          #     Blog posts (.md) + metadata
│       ├── persona/        #     Persona configs + library
│       └── settings.json   #     App settings (auto-generated)
├── settings.example.json   # Settings file example
└── package.json
```

## Data Files

| 파일 | 용도 | 생성 방법 |
|------|------|----------|
| `server/data/settings.json` | API 키 및 앱 설정 | Settings UI에서 자동 생성 |
| `server/data/posts/posts.json` | 게시글 메타데이터 목록 | 글 작성 시 자동 생성 |
| `server/data/posts/*.md` | 게시글 본문 (Markdown) | 글 작성 시 자동 생성 |
| `server/data/persona/` | 페르소나 설정 | 기본 제공, 커스터마이징 가능 |

> 모든 데이터 파일은 로컬에만 저장되며, 개인 데이터는 `.gitignore`로 커밋에서 제외됩니다.
> 각 데이터 파일의 구조는 같은 폴더의 `.example` 파일을 참고하세요.

## Tech Stack

- [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Express](https://expressjs.com/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)

## API Reference

<details>
<summary>API 엔드포인트 목록 (클릭하여 펼치기)</summary>

### Posts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts` | 전체 게시글 목록 |
| GET | `/api/posts/:id` | 게시글 상세 |
| POST | `/api/posts` | 게시글 작성 |
| PUT | `/api/posts/:id` | 게시글 수정 |
| DELETE | `/api/posts/:id` | 게시글 삭제 |

### Comments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/posts/:id/comments` | 댓글 추가 |
| POST | `/api/posts/:id/comments/generate` | AI 댓글 생성 |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | 설정 조회 |
| PUT | `/api/settings` | 설정 수정 |

### Personas

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/personas` | 활성 페르소나 조회 |
| PUT | `/api/personas` | 페르소나 수정 |
| GET | `/api/personas/library` | 페르소나 라이브러리 조회 |
| POST | `/api/personas/add` | 라이브러리에서 페르소나 추가 |
| DELETE | `/api/personas/:id` | 페르소나 제거 |

</details>

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
