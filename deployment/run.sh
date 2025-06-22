bunx drizzle-kit migrate && PID=$!
wait $PID
NODE_ENV=production bun run ./output/server/index.mjs
