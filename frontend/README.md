# Frontend: AI Assistant (React + Vite)

The web app for the Enterprise Structured Ingestion Firewall: a **landing page** and a **chat workspace** with saved conversations, a message-insights panel and light/dark themes. Built with React 18 and Vite 5 in plain JavaScript (JSX). It talks to the FastAPI backend in `../backend`.

---

## Run it

Requires **Node.js 18+** and the backend running on port **8000**.

```bash
cd frontend
npm install        # first time only
npm run dev
```

| Page | URL |
|---|---|
| Landing page | http://localhost:5173/ |
| New chat | http://localhost:5173/chat |
| A saved chat | http://localhost:5173/chat/`<session_id>` |

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server on port 5173 (with backend proxy) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve `dist/` locally to check the build |

---

## Folder structure and what each file does

```text
frontend/
├── README.md
├── package.json              ← dependencies and scripts
├── package-lock.json         ← exact dependency versions
├── vite.config.js            ← dev server + proxy to backend
├── index.html                ← page shell (fonts, mounts #root)
├── .gitignore                ← node_modules/, dist/, .env.local
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── pages/
    │   ├── Landing.jsx
    │   └── Chat.jsx
    ├── components/
    │   ├── Sidebar.jsx
    │   ├── ChatHeader.jsx
    │   ├── EmptyState.jsx
    │   ├── MessageList.jsx
    │   ├── Markdown.jsx
    │   ├── Composer.jsx
    │   ├── InsightsPanel.jsx
    │   ├── CopyButton.jsx
    │   ├── Logo.jsx
    │   └── ThemeToggle.jsx
    ├── hooks/
    │   ├── useBackendStatus.js
    │   └── useTheme.js
    ├── lib/
    │   ├── api.js
    │   ├── intents.js
    │   └── time.js
    └── styles/
        ├── global.css
        ├── landing.css
        └── chat.css
```

### Root files

| File | What it does |
|---|---|
| `index.html` | HTML shell. Loads the Inter and JetBrains Mono fonts from Google Fonts and starts `src/main.jsx`. Page title: "AI Assistant". |
| `vite.config.js` | Enables the React plugin, sets the dev port to 5173, and **proxies** `/api` and `/health` to `http://127.0.0.1:8000`, so the browser only talks to one origin and CORS never matters in development. |
| `package.json` | Libraries: `react`, `react-dom`, `react-router-dom`, `react-markdown`, `remark-gfm`, `lucide-react`; dev tools: `vite`, `@vitejs/plugin-react`. |

### Entry files (`src/`)

| File | What it does |
|---|---|
| `main.jsx` | Starts React, wraps the app in `BrowserRouter`, imports the three CSS files. |
| `App.jsx` | Defines the routes: `/` gives Landing, `/chat/:sessionId?` gives Chat (one route for both new and saved chats, so the page keeps its state when a new chat gets its id), anything else redirects to `/`. |

### Pages (`src/pages/`)

| File | What it does |
|---|---|
| `Landing.jsx` | Marketing page: nav, hero with a fake chat preview, feature cards, "how it works" pipeline (message, classify, validate, respond, save), call-to-action and footer. Contains the GitHub link (`REPO_URL`). |
| `Chat.jsx` | **The main file, start here.** Owns all chat state (conversation list, messages, pending/loading/error, sidebar open/closed) and all backend calls. Loads a saved chat when the URL's `sessionId` changes, sends messages, moves a new chat to `/chat/<id>` after the first reply, and lays out Sidebar, ChatHeader, message area, Composer and InsightsPanel. |

### Components (`src/components/`)

| File | What it does |
|---|---|
| `Sidebar.jsx` | Left column: logo, **New Chat** button, "Recent conversations" list (links to `/chat/<id>` with relative time), backend status pill and theme toggle. Can be collapsed. |
| `ChatHeader.jsx` | Top bar: conversation title, connection chip ("Groq LLM · Online" / "Backend offline"), New chat and Home buttons, mobile menu and show-sidebar buttons. |
| `EmptyState.jsx` | Shown before the first message: "What can I help you with?", three clickable starter prompts (payment, order, general) and capability chips. |
| `MessageList.jsx` | Renders the conversation: user bubbles (with "Not sent" state on failure), assistant cards (intent badge, Markdown answer, risk/priority/action chips, token estimate, Copy), and the "Detecting intent and writing a reply…" typing indicator. Auto-scrolls to the newest message. |
| `Markdown.jsx` | Renders the AI's Markdown with `react-markdown` + GitHub-style tables. Raw HTML is never rendered. Code blocks get a header with a language label and a **Copy snippet** button; tables scroll horizontally; links open in a new tab. |
| `Composer.jsx` | Message box. **Enter** sends, **Shift+Enter** adds a new line. Grows with its content, limited to 5000 characters (same as the backend), shows a counter near the limit. |
| `InsightsPanel.jsx` | Right panel (wide screens only, over 1240px). Shows the **latest** classification (intent, risk, priority, requires action, token estimate), clickable suggested follow-up questions, and a "How each reply is made" card. |
| `CopyButton.jsx` | Small copy-to-clipboard button with a "Copied" confirmation. Used for answers and code snippets. |
| `Logo.jsx` | "AI Assistant" logo linking to the landing page. |
| `ThemeToggle.jsx` | Sun/moon button that switches light/dark mode using `useTheme`. |

### Hooks (`src/hooks/`)

| File | What it does |
|---|---|
| `useBackendStatus.js` | Calls `GET /health` immediately and then every 15 seconds. Returns `"checking"`, `"online"` or `"offline"`; drives the status dots and chips. |
| `useTheme.js` | Light/dark mode. Starts from the saved choice (localStorage key `ai-assistant-theme`) or the OS preference, and sets `<html data-theme="...">`. |

### Library code (`src/lib/`)

| File | What it does |
|---|---|
| `api.js` | **Every request to the backend lives here** (see table below). Handles errors and turns them into readable messages; supports `VITE_API_URL` for a remote backend. |
| `intents.js` | Display labels for each intent (`order_tracking` becomes "Order tracking") and the suggested follow-up prompts shown per intent. Mirrors the values in `backend/app/schemas/ingestion.py`. |
| `time.js` | `formatTime` gives "10:41 AM"; `formatRelative` gives "now", "5m", "3h", "Yesterday", "Mar 4". |

### Styles (`src/styles/`)

| File | What it does |
|---|---|
| `global.css` | Design tokens (colours, light and dark via `[data-theme="dark"]`), base styles, logo, buttons, badges/chips, and Markdown answer styling. Shared responsive helpers. |
| `landing.css` | Landing page: nav, hero, preview window, features, how-it-works, CTA, footer. |
| `chat.css` | Chat workspace: three-column layout (sidebar, chat, insights), sidebar, header, empty state, messages, composer, insights panel, responsive breakpoints (1240px and 860px). |

---

## How it connects to the backend

All calls are in `src/lib/api.js`:

| Function | Backend endpoint | Used for |
|---|---|---|
| `api.health()` | `GET /health` | Green/red status dot |
| `api.listConversations()` | `GET /api/conversations` | Sidebar "Recent conversations" |
| `api.getMessages(id)` | `GET /api/conversations/{id}/messages` | Opening a saved chat |
| `api.analyze(message, id)` | `POST /api/analyze` | Sending a message |

The first message of a new chat is sent **without** a `session_id`. The backend creates one, and the app navigates to `/chat/<session_id>`. Every later message includes that id so the backend can use the conversation history.

The response from `/api/analyze` is split: `response_markdown` becomes the assistant message, and the rest (`intent`, `risk_profile`, `priority`, `requires_action`, `summary`, `token_metadata`) is stored as that message's `analysis`, which feeds the badges and the Insights panel.

---

## Production build

```bash
npm run build      # outputs to dist/
npm run preview
```

The proxy only exists in `npm run dev`. For a deployed build, point the app at your backend by creating `frontend/.env.local`:

```env
VITE_API_URL=https://your-backend.example.com
```

You will also need to restrict CORS on the backend to your frontend's address.

---

## Common problems

| What you see | Fix |
|---|---|
| Red dot / "Backend offline" | Start the backend: `uvicorn app.main:app --reload --port 8000` in `backend/` |
| "Cannot reach the backend" | Same as above |
| `npm` is not recognized | Install Node.js from https://nodejs.org and reopen the terminal |
| Port 5173 in use | Another Vite server is running. Stop it with `Ctrl + C` or use the URL Vite prints |
| Insights panel missing | It only shows on screens wider than 1240px |
| No favicon / 404 for `/favicon.svg` | `index.html` references it but `frontend/public/favicon.svg` doesn't exist yet. Add the file or remove the `<link>` |
