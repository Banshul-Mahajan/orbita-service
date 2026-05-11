#!/bin/bash
DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"

# Use python3.11 if available (to avoid Python 3.13 issues on Mac), otherwise default to python3 (for EC2)
if command -v python3.11 &> /dev/null; then
    PYTHON_CMD="python3.11"
else
    PYTHON_CMD="python3"
fi

echo "Setting up Python virtual environments for all microservices using $PYTHON_CMD..."

BACKEND_DIRS=(
    "auth-service/backend"
    "mvp-mac/backend"
    "knowledge-core/api"
    "Create/create-orbit-mvp/backend"
    "Optimize-Orbit/optimize-orbit/backend"
    "Visibility-orbit/visibility-orbit/backend"
)

for DIR in "${BACKEND_DIRS[@]}"; do
    BACKEND_PATH="$DEPLOY_DIR/$DIR"
    if [ -d "$BACKEND_PATH" ]; then
        echo "  -> Configuring $DIR..."
        $PYTHON_CMD -m venv "$BACKEND_PATH/venv"
        "$BACKEND_PATH/venv/bin/pip" install --upgrade pip --quiet
        if [ -f "$BACKEND_PATH/requirements.txt" ]; then
            "$BACKEND_PATH/venv/bin/pip" install -r "$BACKEND_PATH/requirements.txt" --quiet
        fi
        if [ -d "$DEPLOY_DIR/shared" ]; then
            "$BACKEND_PATH/venv/bin/pip" install -e "$DEPLOY_DIR/shared" --quiet
        fi
    fi
done

echo "Backend virtual environments successfully created."
