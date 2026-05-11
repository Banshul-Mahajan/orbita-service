#!/bin/bash
DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Stopping backend microservices via PM2..."
if command -v pm2 &> /dev/null; then
    pm2 stop all
    pm2 delete all
else
    echo "PM2 not found, skipping."
fi

if [ -f "$DEPLOY_DIR/docker-compose.platform.yml" ]; then
    echo "Stopping Docker DBs..."
    docker-compose -f "$DEPLOY_DIR/docker-compose.platform.yml" down
fi

echo "Backend stopped."
