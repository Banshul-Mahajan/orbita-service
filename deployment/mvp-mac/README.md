# DISCOVER ORBIT — MVP (macOS)

Research & Intelligence Hub: Keywords · SERP · AI Scanner · Intent Heatmap · Questions

---

## Prerequisites

| Tool | Min version | Check | Install |
|------|------------|-------|---------|
| macOS | 12 Monterey+ | `sw_vers` | — |
| Homebrew | any | `brew --version` | `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"` |
| Python | 3.11+ | `python3 --version` | `brew install python@3.11` |
| Node.js | 18+ (20 LTS recommended) | `node --version` | `brew install node@20` |
| Docker Desktop | any | `docker --version` | [docs.docker.com/desktop/install/mac-install](https://docs.docker.com/desktop/install/mac-install/) |

> **Apple Silicon (M1/M2/M3)?** Download the **Apple Silicon** version of Docker Desktop. All Python packages have native ARM64 wheels — no Rosetta needed.

---

## Quickstart — 4 commands

```bash
# 1. From the project root — run the automated setup
bash setup.sh

# 2. Start everything (opens browser automatically)
bash start.sh

# OR start manually in two terminal tabs:

# Tab 1 — Backend
cd backend && source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Tab 2 — Frontend
cd frontend && npm run dev
```

Open **http://localhost:5173** — create a project in the sidebar and start researching.

---

## API Keys (optional — works without them in mock mode)

Edit `backend/.env`:

```bash
OPENAI_API_KEY=sk-...          # Real embeddings + real AI Scanner answers
SERPAPI_KEY=your_key_here      # Real Google SERP results + real keyword data
```

Then restart uvicorn (`Ctrl+C` → `uvicorn app.main:app --reload --port 8000`).

- SerpAPI free tier: **100 searches/month** — [serpapi.com](https://serpapi.com)
- OpenAI: **pay-as-you-go**, ~$0.01 per full research session — [platform.openai.com](https://platform.openai.com/api-keys)

---

## Running Tests

```bash
# All tests (unit + integration, requires Docker running)
bash run_tests.sh

# Unit tests only (no database, very fast)
bash run_tests.sh unit

# Integration tests only
bash run_tests.sh integration
```

Expected: **40+ tests, all passing**.

---

## Project Structure

```
discover-orbit/
├── setup.sh              ← One-time setup script
├── start.sh              ← Start all services
├── stop.sh               ← Stop all services
├── run_tests.sh          ← Run test suite
├── docker-compose.yml    ← PostgreSQL 16 + Redis 7
├── backend/
│   ├── .env              ← API keys (never commit)
│   ├── requirements.txt
│   └── app/
│       ├── main.py       ← FastAPI app
│       ├── config.py     ← Reads .env
│       ├── database.py   ← Async PostgreSQL
│       ├── models.py     ← DB tables
│       ├── schemas.py    ← Request/response shapes
│       ├── routers/      ← HTTP endpoints
│       └── services/     ← Business logic
└── frontend/
    └── src/
        ├── api/          ← Typed API client
        ├── components/   ← Layout + shared UI
        ├── pages/        ← 6 module pages
        └── store/        ← Zustand project state
```

---

## Service URLs

| Service | URL |
|---------|-----|
| App UI | http://localhost:5173 |
| API docs (Swagger) | http://localhost:8000/docs |
| API health | http://localhost:8000/health |
| PostgreSQL | localhost:5432 (user: orbit, pass: orbit123) |
| Redis | localhost:6379 |

---

## Common Issues on Mac

| Problem | Fix |
|---------|-----|
| `brew: command not found` | Run the Homebrew install command, then `source ~/.zshrc` |
| `python3.11: command not found` | `echo 'export PATH="/opt/homebrew/opt/python@3.11/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc` |
| `source venv/bin/activate` fails | `chmod +x venv/bin/activate` then try again |
| Port 5432 already in use | Stop local PostgreSQL: `brew services stop postgresql@16` |
| Docker: cannot connect to daemon | Open Docker Desktop app from Applications |
| `uvicorn: command not found` | venv not activated — run `source backend/venv/bin/activate` |
| M1/M2 build fails for asyncpg | `xcode-select --install` then reinstall |

---

## Stopping Everything

```bash
bash stop.sh

# Or manually:
Ctrl+C          # in each terminal tab
docker compose stop    # keeps your data
docker compose down    # stops AND removes containers (data preserved in volumes)
docker compose down -v # stops AND deletes all data (fresh start)
```

---

## What's Mock vs Real

| Feature | Mock mode (no keys) | Real mode (with keys) |
|---------|--------------------|-----------------------|
| Keyword data | Generic variations | Google autocomplete + related searches |
| SERP results | Same 10 fake domains | Actual top-ranking pages for your query |
| SERP headings | Template text | Scraped live from each URL |
| AI answers | Canned responses | Real GPT-4o-mini / Gemini / Perplexity |
| AI citations | Fixed mock domains | Real cited URLs |
| Heatmap overlap | Always 0% | Actual domain comparison |
| Speed | Instant | 3–15 seconds per module |
| Cost | Free | ~$0.01 per session |

---

## Stack

**Backend:** FastAPI · SQLAlchemy (async) · asyncpg · PostgreSQL 16 · Redis · Celery-ready  
**Frontend:** React 18 · Vite · TypeScript · Tailwind CSS · TanStack Query · Zustand  
**Infrastructure:** Docker Compose  
**Tests:** pytest · pytest-asyncio · httpx (40+ tests)
