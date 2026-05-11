#!/bin/bash
# ============================================================
# DISCOVER ORBIT — Start all services (macOS)
# Run from project root: bash start.sh
# ============================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo -e "${BLUE}Starting DISCOVER ORBIT...${NC}"
echo ""

# 1. Check Docker containers
if ! docker exec orbit_postgres pg_isready -U orbit -q 2>/dev/null; then
  echo "Starting Docker containers..."
  docker compose up -d
  sleep 4
fi
echo -e "${GREEN}✅ PostgreSQL + Redis running${NC}"

# 2. Start backend in background
cd "$SCRIPT_DIR/backend"
if [ ! -d "venv" ]; then
  echo -e "${YELLOW}⚠️  venv not found. Run: bash setup.sh first${NC}"
  exit 1
fi

source venv/bin/activate
echo -e "${GREEN}✅ Python venv activated${NC}"

# Kill any existing uvicorn on 8000
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend started (PID $BACKEND_PID) → http://localhost:8000${NC}"

# Wait for backend to be ready
sleep 2
for i in $(seq 1 15); do
  if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

# 3. Start frontend in background
cd "$SCRIPT_DIR/frontend"
# Kill any existing process on 5173
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend started (PID $FRONTEND_PID) → http://localhost:5173${NC}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  All services running!${NC}"
echo ""
echo "  App UI:      http://localhost:5173"
echo "  API docs:    http://localhost:8000/docs"
echo "  API health:  http://localhost:8000/health"
echo ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop all services"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Open browser after short delay
sleep 3
open http://localhost:5173 2>/dev/null || true

# Trap Ctrl+C to kill both servers cleanly
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Keep script alive
wait
