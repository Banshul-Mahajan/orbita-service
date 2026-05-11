#!/bin/bash
# ============================================================
# DISCOVER ORBIT — macOS Setup Script
# Run this from the project root: bash setup.sh
# ============================================================

set -e  # exit immediately if any command fails

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Colour

STEP=0
step() {
  STEP=$((STEP + 1))
  echo ""
  echo -e "${BLUE}━━━ Step ${STEP}: $1 ━━━${NC}"
}

ok()   { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; exit 1; }

# ── Header ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        DISCOVER ORBIT — Mac Setup        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""
echo "This script will:"
echo "  1. Check Homebrew, Python 3.11, Node 20, Docker"
echo "  2. Start Docker containers (PostgreSQL + Redis)"
echo "  3. Create Python virtual environment"
echo "  4. Install all backend dependencies"
echo "  5. Create the test database"
echo "  6. Install all frontend dependencies"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read -r

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Step 1: Check Homebrew ────────────────────────────────────────────────────
step "Checking Homebrew"
if ! command -v brew &>/dev/null; then
  fail "Homebrew not found. Install it first:
  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"
  Then run this script again."
fi
ok "Homebrew $(brew --version | head -1)"

# ── Step 2: Check Python ──────────────────────────────────────────────────────
step "Checking Python 3.11+"
PYTHON=""
for cmd in python3.12 python3.11 python3; do
  if command -v "$cmd" &>/dev/null; then
    VER=$("$cmd" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
    MAJOR=$(echo "$VER" | cut -d. -f1)
    MINOR=$(echo "$VER" | cut -d. -f2)
    if [ "$MAJOR" -eq 3 ] && [ "$MINOR" -ge 11 ]; then
      PYTHON="$cmd"
      ok "Found $cmd → Python $VER"
      break
    fi
  fi
done

if [ -z "$PYTHON" ]; then
  echo "Python 3.11+ not found. Installing via Homebrew..."
  brew install python@3.11
  PYTHON="python3.11"
  ok "Installed Python 3.11"
fi

# ── Step 3: Check Node ────────────────────────────────────────────────────────
step "Checking Node.js 20+"
if ! command -v node &>/dev/null; then
  fail "Node.js not found. Install it:
  brew install node@20
  Then add to PATH and run this script again."
fi
NODE_VER=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  fail "Node $(node --version) is too old. Need Node 18+. Run: brew upgrade node"
fi
ok "Node $(node --version)"
ok "npm $(npm --version)"

# ── Step 4: Check Docker ──────────────────────────────────────────────────────
step "Checking Docker"
if ! command -v docker &>/dev/null; then
  fail "Docker not found. Download Docker Desktop for Mac from:
  https://docs.docker.com/desktop/install/mac-install/"
fi
if ! docker info &>/dev/null 2>&1; then
  fail "Docker is installed but not running. Please open Docker Desktop and wait for it to start, then run this script again."
fi
ok "Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"

# ── Step 5: Start Docker containers ──────────────────────────────────────────
step "Starting PostgreSQL + Redis containers"
docker compose up -d
sleep 3  # give containers a moment to initialise

# Wait for PostgreSQL to be ready (up to 30 seconds)
echo "Waiting for PostgreSQL to be ready..."
for i in $(seq 1 30); do
  if docker exec orbit_postgres pg_isready -U orbit -q 2>/dev/null; then
    ok "PostgreSQL is ready"
    break
  fi
  if [ "$i" -eq 30 ]; then
    fail "PostgreSQL did not start in 30 seconds. Check: docker logs orbit_postgres"
  fi
  sleep 1
done

# ── Step 6: Create test database ─────────────────────────────────────────────
step "Creating test database"
docker exec orbit_postgres psql -U orbit -c "CREATE DATABASE discover_orbit_test;" 2>/dev/null || true
ok "Test database ready (discover_orbit_test)"

# ── Step 7: Python virtual environment ───────────────────────────────────────
step "Creating Python virtual environment"
cd "$SCRIPT_DIR/backend"

if [ -d "venv" ]; then
  warn "venv/ already exists — skipping creation"
else
  $PYTHON -m venv venv
  ok "Virtual environment created with $PYTHON"
fi

# Activate
source venv/bin/activate
ok "Virtual environment activated → $(python --version)"

# ── Step 8: Install Python dependencies ──────────────────────────────────────
step "Installing Python dependencies"
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
ok "All Python packages installed"

# Verify key packages
python -c "import fastapi; print(f'  fastapi {fastapi.__version__}')"
python -c "import sqlalchemy; print(f'  sqlalchemy {sqlalchemy.__version__}')"
python -c "import numpy; print(f'  numpy {numpy.__version__}')"

# ── Step 9: Install frontend dependencies ────────────────────────────────────
step "Installing frontend dependencies"
cd "$SCRIPT_DIR/frontend"
npm install --silent
ok "All npm packages installed"

# ── Done ─────────────────────────────────────────────────────────────────────
cd "$SCRIPT_DIR"
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           ✅  Setup complete!                        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps:"
echo ""
echo -e "  ${BLUE}Terminal 1 — Backend:${NC}"
echo "    cd backend"
echo "    source venv/bin/activate"
echo "    uvicorn app.main:app --reload --port 8000"
echo ""
echo -e "  ${BLUE}Terminal 2 — Frontend (new tab: Cmd+T):${NC}"
echo "    cd frontend"
echo "    npm run dev"
echo ""
echo -e "  ${BLUE}Then open:${NC}  http://localhost:5173"
echo ""
echo -e "  ${YELLOW}Optional — add API keys to backend/.env then restart uvicorn.${NC}"
echo "    OPENAI_API_KEY=sk-..."
echo "    SERPAPI_KEY=..."
echo ""
