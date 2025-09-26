#!/bin/bash
set -euo pipefail

bun install --frozen-lockfile --production && \
docker build \
  -t notkamui/miniverso:latest \
  -t notkamui/miniverso:$APP_VERSION \
  -f deployment/Dockerfile \
  --platform linux/amd64 \
  .

rm -rf node_modules
