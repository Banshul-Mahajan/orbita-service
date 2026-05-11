#!/bin/bash
# ============================================================
# DISCOVER ORBIT — Run tests (macOS)
# ============================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/backend"

# Activate venv
if [ ! -d "venv" ]; then
  echo -e "${RED}❌ venv not found. Run setup.sh first.${NC}"
  exit 1
fi
source venv/bin/activate

# Install test dependencies if missing
pip show pytest-asyncio &>/dev/null || pip install pytest pytest-asyncio pytest-env httpx --quiet

# Check Docker is running
if ! docker exec orbit_postgres pg_isready -U orbit -q 2>/dev/null; then
  echo "Starting Docker containers for tests..."
  cd "$SCRIPT_DIR" && docker compose up -d && sleep 3
  cd "$SCRIPT_DIR/backend"
fi

echo ""
echo -e "${BLUE}Running DISCOVER ORBIT test suite...${NC}"
echo ""

# Run based on argument
case "${1:-all}" in
  unit)
    echo "Running unit tests only (no database needed)..."
    pytest tests/test_services.py -v
    ;;
  integration)
    echo "Running integration tests (requires Docker DB)..."
    pytest tests/test_projects.py tests/test_keywords.py tests/test_serp.py \
           tests/test_ai_scan.py tests/test_heatmap.py tests/test_questions.py -v
    ;;
  all|*)
    echo "Running all tests..."
    pytest -v
    ;;
esac

EXIT_CODE=$?
echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
else
  echo -e "${RED}❌ Some tests failed. See output above.${NC}"
fi
exit $EXIT_CODE
