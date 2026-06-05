#!/bin/bash

set -e

# Check dependencies
command -v docker >/dev/null 2>&1 || { echo "Error: Docker not installed"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || docker compose version >/dev/null 2>&1 || { echo "Error: Docker Compose not installed"; exit 1; }

# Setup
mkdir -p data
docker-compose down 2>/dev/null || true

# Build and start
docker-compose build --quiet
docker-compose up -d

# Wait and verify
sleep 5
docker-compose ps | grep -q "Up" && echo "Running at http://localhost:3000" || { echo "Failed to start. Check: docker-compose logs"; exit 1; }
