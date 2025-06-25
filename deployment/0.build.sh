#!/bin/sh
set -e

bun install --frozen-lockfile && \
bun run build
