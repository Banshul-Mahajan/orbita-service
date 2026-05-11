#!/bin/bash
DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"

ENV_FILE="$DEPLOY_DIR/.env"
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    echo "Warning: .env file not found."
fi

if [ -f "$DEPLOY_DIR/docker-compose.platform.yml" ]; then
    echo "Starting Docker DBs (Postgres, Redis, Weaviate)..."
    docker-compose -f "$DEPLOY_DIR/docker-compose.platform.yml" up -d
fi

ECOSYSTEM_FILE="$DEPLOY_DIR/ecosystem.config.js"
if [ -f "$ECOSYSTEM_FILE" ]; then
    echo "Starting backend microservices via PM2..."
    pm2 start "$ECOSYSTEM_FILE"
    pm2 save
else
    echo "Error: ecosystem.config.js not found."
fi

echo "Backend startup complete."
