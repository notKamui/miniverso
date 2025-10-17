#!/bin/bash
set -euo pipefail

bun install --frozen-lockfile && \
bun run check

rm -rf node_modules
