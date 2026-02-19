# Monolog

> An AI blog that writes the first comment on your posts.

## The Power of the First Comment

On the internet, the first comment shapes how everyone else reads a post. 
But the reality? Most posts never even get one.

If you've ever written a blog, you know the feeling. 
The disappointment is one thing, but **without feedback, your writing never improves.** You write alone, read alone, and it ends alone.

Monolog solves this. When you publish a post, **AI readers with different perspectives** read your writing and leave comments. 
They become the first readers of your work.

![Writing a post and receiving AI comments](public/monolog_posting.gif)

## How It Works

1. **Write** — Compose your post in a Markdown editor
2. **AI reads** — Multiple personas read your post from their unique perspectives
3. **Comments arrive** — From warm encouragement to sharp critique, diverse feedback appears
4. **Conversation continues** — Reply to comments and AI responds back, creating a real dialogue

![Replying to AI comments and continuing the conversation](public/monolog_reply.gif)

## Your First Readers

The AI readers who read your writing first:

| Persona | Role | What they comment on |
|---------|------|---------------------|
| **Mina** | First Reader | What resonated emotionally, warm first impressions |
| **Grace** | Writing Companion | Where sentences shine, where flow breaks |
| **James** | Practical Mentor | Reality-checking ideas with practical wisdom |
| **Sam** | Logic Critic | Logical gaps, hidden premises, weak arguments |
| **Dylan** | Contrarian | Devil's advocate who strengthens ideas by flipping them |

Beyond these, you can add readers from a **library of 20+ personas** — a VC partner who gives pitch feedback, a poet who reads the emotion in your words, and more. You can also create your own.

## When To Use

- **Writing you're not ready to share** — Unfinished thoughts, controversial topics
- **When you need beta-stage feedback** — Validate from multiple angles before publishing
- **When you need someone to respond** — Develop your writing through dialogue, even when writing alone

## Privacy & Local-First

We didn't skip the server and database because we ran out of time.

Monolog's philosophy is **privacy and local-first**. Since our target includes people writing things they're not ready to share publicly, your writing should only exist on your own machine.

- **All data stored locally** — Posts, comments, settings are all files on your computer
- **BYOK (Bring Your Own Key)** — Use your own API key with your own LLM account
- **No server** — Nothing is uploaded to the cloud

> We're working toward fully local implementation through on-device LLMs.

---

## Quick Start

### 1. Prerequisites

- **Node.js 18+** ([Download](https://nodejs.org/))
- **API Key** from at least one provider:
  - [Anthropic](https://console.anthropic.com/) — Claude
  - [OpenAI](https://platform.openai.com/) — GPT
  - [Google AI Studio](https://aistudio.google.com/) — Gemini

### 2. Install & Run

```bash
git clone https://github.com/YOUR_USERNAME/monolog.git
cd monolog
npm install
npm run dev
```

Open http://localhost:3001 in your browser.

### 3. Set Up API Key

1. Click **Settings** in the sidebar
2. In the **Providers** tab, enter your API key and click **Save**
3. Click the provider to set it as **Active**

That's it. Now when you write a post, AI personas will automatically leave the first comments.

![Setting up API key in the Settings page](public/monolog_settings.gif)

> **Note**: API keys are stored locally in `server/data/settings.json` and excluded from commits via `.gitignore`.

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

| File | Purpose | How it's created |
|------|---------|-----------------|
| `server/data/settings.json` | API keys & app settings | Auto-generated via Settings UI |
| `server/data/posts/posts.json` | Post metadata list | Auto-generated when writing |
| `server/data/posts/*.md` | Post content (Markdown) | Auto-generated when writing |
| `server/data/persona/` | Persona configurations | Pre-configured, customizable |

> All data files are stored locally only. Personal data is excluded from commits via `.gitignore`.
> See the `.example` files in each folder for structure reference.

<details>
<summary>API Reference (click to expand)</summary>

### Posts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts` | List all posts |
| GET | `/api/posts/:id` | Get a single post |
| POST | `/api/posts` | Create a post |
| PUT | `/api/posts/:id` | Update a post |
| DELETE | `/api/posts/:id` | Delete a post |

### Comments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/posts/:id/comments` | Add a comment |
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
| DELETE | `/api/personas/:id` | Remove a persona |

</details>

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
