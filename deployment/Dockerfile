FROM oven/bun:1-alpine AS base
WORKDIR /app
ENV NODE_ENV=production
ENV BUILD_ENV=production

COPY bun.lock ./
COPY package.json ./
COPY scripts ./scripts

FROM base AS builder

RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM base AS production

RUN bun install --frozen-lockfile --production

COPY --from=builder /app/public ./public
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.drizzle ./.drizzle
COPY --from=builder /app/dist/serve.js ./

USER bun
EXPOSE 3000
CMD ["bun", "serve.js"]
