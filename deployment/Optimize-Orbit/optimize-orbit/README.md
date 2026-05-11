# ⬡ Optimize Orbit — MVP

On-Page Intelligence Layer: SEO + GEO + E-E-A-T scoring, Schema auto-builder, React UI.

---

## Quick Start (macOS)

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
uvicorn main:app --reload --port 8000
```

API is live at → http://localhost:8000
Swagger docs  → http://localhost:8000/docs

### 2. Frontend (new terminal tab)

```bash
cd frontend
npm install
npm run dev
```

App is live at → http://localhost:5173

---

## What it scores

| Module       | Weight | Checks |
|---|---|---|
| SEO          | 35%    | Keyword density, headings, word count, external links |
| GEO          | 30%    | Named entities, factual markers, structure, sentence length |
| E-E-A-T      | 20%    | Author, citations, date, expertise signals, YMYL disclaimer |
| Schema       | 15%    | Auto-detects Article / FAQ / HowTo and generates JSON-LD |

## Input modes

- **Text** — paste Markdown content directly
- **URL**  — scrapes and analyses any public web page
- **File** — upload a .txt or .md file

---

## Test curl commands

```bash
# Health check
curl http://localhost:8000/health

# Analyse text
curl -s -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"content":"# My Article\n\nBy Jane Smith. Published January 2024.\n\nContent here...","target_keyword":"my topic","content_type":"article","author_name":"Jane Smith"}'

# Analyse URL
curl -s -X POST http://localhost:8000/analyze/url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://en.wikipedia.org/wiki/Python_(programming_language)","target_keyword":"python"}'

# Analyse file
curl -s -X POST http://localhost:8000/analyze/file \
  -F "file=@/path/to/your/file.md" \
  -F "target_keyword=your keyword" \
  -F "content_type=article"
```

---

## Project structure

```
optimize-orbit/
├── backend/
│   ├── main.py                  ← FastAPI app + 3 endpoints
│   ├── requirements.txt
│   └── services/
│       ├── seo_scorer.py        ← keyword, headings, links
│       ├── geo_scorer.py        ← spaCy NER, facts, structure
│       ├── eeat_analyzer.py     ← author, citations, YMYL
│       ├── schema_builder.py    ← JSON-LD auto-generator
│       ├── score_composer.py    ← weighted combiner
│       └── scraper.py           ← URL fetcher + HTML→text
└── frontend/
    └── src/
        ├── App.jsx              ← root, state management
        ├── api.js               ← fetch calls to backend
        └── components/
            ├── InputPanel.jsx   ← text/url/file input
            ├── ResultsPanel.jsx ← tabs: overview/issues/schema/details
            ├── ScoreCircle.jsx  ← animated SVG gauge
            ├── SubScores.jsx    ← bar chart per module
            ├── IssuesList.jsx   ← expandable issues with fixes
            └── SchemaViewer.jsx ← JSON-LD viewer + copy
```

---

## Common errors

| Error | Fix |
|---|---|
| `No module named 'spacy'` | Run `source venv/bin/activate` first |
| `[E050] Can't find model` | Run `python -m spacy download en_core_web_sm` |
| CORS error in browser | Make sure backend is running on port 8000 |
| Blank React screen | Check browser console (F12) for JS errors |
| `npm install` fails | Run `node --version` — need Node 18+ |
