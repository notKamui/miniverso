#!/bin/bash
set -euo pipefail

pnpm install --frozen-lockfile && \
pnpm run lint && \
pnpm run type-check
