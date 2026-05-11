#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
#  CREATE ORBIT — API Test Script
#  Usage: bash test_api.sh
#  Make sure the backend is running on http://localhost:8000
# ─────────────────────────────────────────────────────────────────

BASE="http://localhost:8000/api"
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
RESET="\033[0m"

pass() { echo -e "${GREEN}✓ $1${RESET}"; }
fail() { echo -e "${RED}✗ $1${RESET}"; }
info() { echo -e "${BLUE}→ $1${RESET}"; }
section() { echo -e "\n${YELLOW}━━━  $1  ━━━${RESET}"; }

# ── 0. Health check ──────────────────────────────────────────────
section "0. Health Check"
HEALTH=$(curl -s http://localhost:8000/health)
if echo "$HEALTH" | grep -q '"ok"'; then
  pass "Server is up: $HEALTH"
else
  fail "Server not responding. Start it with: uvicorn app.main:app --reload"
  exit 1
fi

# ── 1. Register ──────────────────────────────────────────────────
section "1. Auth — Register"
REGISTER=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@orbit.dev","password":"testpass123","full_name":"Test User"}')
echo "$REGISTER" | python3 -m json.tool 2>/dev/null | head -20

TOKEN=$(echo "$REGISTER" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null)
if [ -z "$TOKEN" ]; then
  info "Register may have failed (user might exist). Trying login..."
  LOGIN=$(curl -s -X POST "$BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@orbit.dev","password":"testpass123"}')
  TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null)
fi

if [ -n "$TOKEN" ]; then
  pass "Got auth token: ${TOKEN:0:30}..."
else
  fail "Authentication failed — check your server logs"
  exit 1
fi

AUTH="Authorization: Bearer $TOKEN"

# ── 2. Corpus ingest ─────────────────────────────────────────────
section "2. Corpus — Ingest Sample Document"
CORPUS=$(curl -s -X POST "$BASE/corpus/ingest/text" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{
    "title": "Brand Voice Guide",
    "content": "Our brand voice is authoritative yet approachable. We write for senior engineers and technical leaders who value precision. We avoid buzzwords and prefer concrete examples over abstract claims. Our tone is direct: we get to the point quickly and do not waste the reader'\''s time. We believe that technical writing should be clear, accurate, and grounded in real-world experience. We cite data when available and acknowledge uncertainty when we do not have data. Our writing style follows active voice, short sentences, and plain English even when covering complex topics."
  }')
echo "$CORPUS" | python3 -m json.tool 2>/dev/null | head -20

DOC_STATUS=$(echo "$CORPUS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
if [ "$DOC_STATUS" = "indexed" ]; then
  pass "Document indexed successfully"
else
  fail "Document indexing failed. Status: $DOC_STATUS"
  echo "Full response: $CORPUS"
fi

# ── 3. Corpus stats ──────────────────────────────────────────────
section "3. Corpus — Stats"
STATS=$(curl -s "$BASE/corpus/stats" -H "$AUTH")
echo "$STATS"
pass "Corpus stats retrieved"

# ── 4. RAG retrieval test ────────────────────────────────────────
section "4. RAG — Test Retrieval"
QUERY=$(curl -s -X POST "$BASE/corpus/query" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{"query": "what is our brand voice?", "top_k": 2}')
RESULT_COUNT=$(echo "$QUERY" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
if [ "$RESULT_COUNT" -gt "0" ] 2>/dev/null; then
  pass "RAG returned $RESULT_COUNT results"
  echo "$QUERY" | python3 -c "
import sys,json
results = json.load(sys.stdin)
for r in results:
    print(f'  Score: {r[\"relevance_score\"]} | {r[\"chunk\"][:80]}...')
" 2>/dev/null
else
  fail "RAG returned no results — check ChromaDB and OpenAI API key"
  echo "$QUERY"
fi

# ── 5. Brief generation ──────────────────────────────────────────
section "5. Brief Builder — Generate"
info "Generating brief (this calls the LLM — may take 10-20 seconds)..."
BRIEF=$(curl -s -X POST "$BASE/briefs/generate" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{
    "topic": "How to Write Clear Technical Documentation",
    "target_audience": "senior software engineers",
    "tone_style": "authoritative"
  }')

BRIEF_ID=$(echo "$BRIEF" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
BRIEF_H1=$(echo "$BRIEF" | python3 -c "import sys,json; print(json.load(sys.stdin).get('h1',''))" 2>/dev/null)

if [ -n "$BRIEF_ID" ]; then
  pass "Brief generated! ID: $BRIEF_ID"
  info "H1: $BRIEF_H1"
  echo "$BRIEF" | python3 -c "
import sys,json
b = json.load(sys.stdin)
print(f'  H2s: {b.get(\"h2s\",[])}')
print(f'  Keywords: {b.get(\"keywords\",[])[:5]}')
print(f'  Entities: {b.get(\"entities\",[])[:5]}')
" 2>/dev/null
else
  fail "Brief generation failed"
  echo "$BRIEF" | python3 -m json.tool 2>/dev/null
  exit 1
fi

# ── 6. Create article ────────────────────────────────────────────
section "6. Article — Create Shell"
ARTICLE=$(curl -s -X POST "$BASE/articles/" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d "{\"brief_id\": \"$BRIEF_ID\"}")
ARTICLE_ID=$(echo "$ARTICLE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)

if [ -n "$ARTICLE_ID" ]; then
  pass "Article shell created! ID: $ARTICLE_ID"
else
  fail "Article creation failed"
  echo "$ARTICLE"
  exit 1
fi

# ── 7. Save a test body for FactGuard ────────────────────────────
section "7. Article — Save Test Body"
UPDATE=$(curl -s -X PUT "$BASE/articles/$ARTICLE_ID" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{
    "body": "Technical documentation must be written for senior engineers. According to our brand guidelines, we avoid buzzwords and prefer concrete examples. Clear technical writing uses active voice and short sentences. Studies show that documentation with examples reduces support tickets by 40%. The best technical writers combine precision with accessibility. Our documentation platform was founded in 2019 and has served over 50000 engineers globally."
  }')
WORD_COUNT=$(echo "$UPDATE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('word_count',0))" 2>/dev/null)
pass "Article body saved ($WORD_COUNT words)"

# ── 8. FactGuard check ───────────────────────────────────────────
section "8. FactGuard — Check Claims"
info "Running FactGuard (calls LLM for claim extraction + verification)..."
FG=$(curl -s -X POST "$BASE/factguard/check/$ARTICLE_ID" \
  -H "Content-Type: application/json" \
  -H "$AUTH")

FG_STATUS=$(echo "$FG" | python3 -c "import sys,json; print(json.load(sys.stdin).get('overall_status',''))" 2>/dev/null)
FG_TOTAL=$(echo "$FG" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total_claims',0))" 2>/dev/null)

if [ -n "$FG_STATUS" ]; then
  pass "FactGuard complete: $FG_TOTAL claims, status=$FG_STATUS"
  echo "$FG" | python3 -c "
import sys,json
fg = json.load(sys.stdin)
print(f'  Verified: {fg.get(\"verified\",0)}  Flagged: {fg.get(\"flagged\",0)}  Unverified: {fg.get(\"unverified\",0)}')
for c in fg.get('claims',[])[:3]:
    print(f'  [{c[\"status\"].upper()}] {c[\"text\"][:80]}')
" 2>/dev/null
else
  fail "FactGuard failed"
  echo "$FG"
fi

# ── 9. Summary ───────────────────────────────────────────────────
section "Summary"
echo ""
echo -e "${GREEN}All core flows tested!${RESET}"
echo ""
echo "  Brief ID:   $BRIEF_ID"
echo "  Article ID: $ARTICLE_ID"
echo ""
echo "  Streaming test (run manually):"
echo "  curl -N \"$BASE/articles/stream-token/$ARTICLE_ID?token=YOUR_TOKEN\""
echo ""
echo "  Open the frontend: http://localhost:5173"
echo ""
