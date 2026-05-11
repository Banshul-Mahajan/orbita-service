#!/bin/bash
# ============================================================
# DISCOVER ORBIT — Stop all services (macOS)
# ============================================================

echo "Stopping DISCOVER ORBIT services..."

# Kill uvicorn
lsof -ti:8000 | xargs kill -9 2>/dev/null && echo "✅ Backend stopped" || echo "Backend was not running"

# Kill vite dev server
lsof -ti:5173 | xargs kill -9 2>/dev/null && echo "✅ Frontend stopped" || echo "Frontend was not running"

# Stop Docker containers (keeps data)
docker compose stop 2>/dev/null && echo "✅ Docker containers stopped"

echo ""
echo "All services stopped. Run 'bash start.sh' to restart."
