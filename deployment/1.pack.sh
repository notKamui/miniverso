#!/bin/bash
set -euo pipefail

docker build \
  -t notkamui/miniverso:latest \
  -t notkamui/miniverso:$APP_VERSION \
  -f deployment/Dockerfile \
  --platform linux/amd64 \
  .
