#!/bin/bash
DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Building Mission Control frontend..."
FRONTEND_PATH="$DEPLOY_DIR/mission-control"

if [ -d "$FRONTEND_PATH" ]; then
    cd "$FRONTEND_PATH"
    echo "Running npm install..."
    npm install --silent
    echo "Running npm run build..."
    npm run build
    echo "Frontend successfully built to $FRONTEND_PATH/dist"
else
    echo "Error: Frontend directory not found at $FRONTEND_PATH"
fi
