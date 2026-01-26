#!/bin/bash
set -euo pipefail

bun install --frozen-lockfile && \
bun run lint
