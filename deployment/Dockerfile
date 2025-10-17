FROM oven/bun:1-alpine AS base
WORKDIR /app

FROM base AS builder

COPY bun.lock ./
COPY package.json ./
RUN bun install --frozen-lockfile

COPY . .
ENV NODE_ENV=production
ENV BUILD_ENV=production
RUN bun run build

FROM base AS production

ENV NODE_ENV=production

COPY bun.lock ./
COPY package.json ./
RUN bun install --frozen-lockfile --production

COPY --from=builder /app/public ./public
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.drizzle ./.drizzle
COPY --from=builder /app/dist/serve.js ./

EXPOSE 3000
CMD ["bun", "serve.js"]
