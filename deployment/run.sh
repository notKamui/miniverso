bunx drizzle-kit migrate && PID=$!
wait $PID
bun run ./output/server/index.mjs
