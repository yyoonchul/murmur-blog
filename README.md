# Monolog

> 당신의 글에 첫 번째 댓글을 달아주는 AI 블로그

## 첫댓의 힘

인터넷에서 첫 번째 댓글은 글 전체의 분위기를 좌지우지합니다. 그런데 현실은? 대부분의 글은 첫 댓글조차 받지 못합니다.

블로그를 쓰는 사람이라면 공감할 겁니다. 500뷰에 댓글 0개. 실망감은 둘째 치고, **피드백이 없으니 글이 나아지지 않습니다.** 혼자 쓰고, 혼자 읽고, 혼자 끝나는 글.

Monolog는 이 문제를 해결합니다. 글을 올리면 **서로 다른 관점을 가진 5명의 AI 독자**가 당신의 글을 읽고 댓글을 남깁니다. 여러분의 글의 첫 번째 독자가 되어줍니다.

## How It Works

1. **글을 쓴다** — 마크다운 에디터로 글을 작성합니다
2. **AI가 읽는다** — 5명의 페르소나가 각자의 관점에서 글을 읽습니다
3. **댓글이 달린다** — 따뜻한 공감부터 날카로운 지적까지, 다양한 피드백이 달립니다
4. **대화가 이어진다** — 댓글에 대댓글을 달면 AI가 답글을 달고, 내 댓글에 AI가 반응합니다

## Your First Readers

당신의 글을 가장 먼저 읽어주는 5명의 AI 독자들:

| 페르소나 | 역할 | 이런 댓글을 남깁니다 |
|---------|------|------------------|
| **Mina** | First Reader | 어떤 부분이 마음에 와닿았는지, 따뜻한 첫인상 |
| **Eunseo** | Writing Fellow | 문장이 살아있는 곳, 흐름이 끊기는 곳 |
| **Jihoon** | Practical Mentor | 이거 실제로 되는 건지, 현실성 체크 |
| **Suhyun** | Argument Critic | 논리의 허점, 숨어있는 전제를 찾아냄 |
| **Doyun** | Contrarian | 모두가 동의할 때 반대 의견을 던짐 |

이 외에도 **15개 이상의 페르소나 라이브러리**에서 원하는 독자를 추가할 수 있습니다. VC 심사역처럼 피칭 피드백을 주는 페르소나, 시인처럼 글의 감정을 읽는 페르소나 등. 직접 만들 수도 있습니다.

## When To Use

- **세상에 공개하기 부끄러운 글** — 아직 다듬어지지 않은 생각, 논란이 될 수 있는 주제
- **베타 단계의 피드백이 필요할 때** — 공개 전에 다양한 관점에서 검증하고 싶을 때
- **누군가의 반응이 필요한 순간** — 혼자 쓰지만, 대화하듯 글을 발전시키고 싶을 때

## Privacy & Local-First

서버와 DB를 연결하지 않은 건 시간이 없어서가 아닙니다.

Monolog의 철학은 **프라이버시와 로컬 퍼스트**입니다. 공개하기 부끄러운 글을 쓰는 사람이 타깃이기에, 당신의 글은 당신의 컴퓨터에서만 존재해야 합니다.

- **모든 데이터는 로컬에 저장** — 글, 댓글, 설정 모두 내 컴퓨터의 파일
- **BYOK (Bring Your Own Key)** — 내 API 키로 내 계정의 LLM을 사용
- **서버 없음** — 클라우드에 아무것도 올라가지 않음

> 추후에는 온디바이스 LLM을 통한 완전한 로컬 구현을 지향합니다.

---

## Quick Start

### 1. 준비사항

- **Node.js 18+** ([다운로드](https://nodejs.org/))
- **API Key** 하나 이상 (아래 중 하나):
  - [Anthropic](https://console.anthropic.com/) — Claude
  - [OpenAI](https://platform.openai.com/) — GPT
  - [Google AI Studio](https://aistudio.google.com/) — Gemini

### 2. 설치 & 실행

```bash
git clone https://github.com/YOUR_USERNAME/monolog.git
cd monolog
npm install
npm run dev
```

브라우저에서 http://localhost:3001 을 엽니다.

### 3. API 키 설정

1. 좌측 사이드바에서 **Settings** 클릭
2. **Providers** 탭에서 사용할 AI 프로바이더의 API Key를 입력하고 **Save**
3. 프로바이더를 클릭하여 **Active**로 설정

설정 완료. 이제 글을 쓰면 AI 페르소나들이 자동으로 첫 댓글을 남깁니다.

> **참고**: API 키는 `server/data/settings.json`에 로컬 저장되며, `.gitignore`로 커밋에서 제외됩니다.

---

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
└── package.json
```

## Tech Stack

- [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Express](https://expressjs.com/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)

## Data Files

| 파일 | 용도 | 생성 방법 |
|------|------|----------|
| `server/data/settings.json` | API 키 및 앱 설정 | Settings UI에서 자동 생성 |
| `server/data/posts/posts.json` | 게시글 메타데이터 목록 | 글 작성 시 자동 생성 |
| `server/data/posts/*.md` | 게시글 본문 (Markdown) | 글 작성 시 자동 생성 |
| `server/data/persona/` | 페르소나 설정 | 기본 제공, 커스터마이징 가능 |

> 모든 데이터 파일은 로컬에만 저장되며, 개인 데이터는 `.gitignore`로 커밋에서 제외됩니다.
> 각 데이터 파일의 구조는 같은 폴더의 `.example` 파일을 참고하세요.

<details>
<summary>API Reference (클릭하여 펼치기)</summary>

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
