FROM oven/bun:alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/.drizzle ./.drizzle
COPY deployment/drizzle.config.ts ./
COPY deployment/run.sh ./

RUN chmod +x run.sh

RUN bun add drizzle-kit drizzle-orm postgres

EXPOSE 3000
CMD ["sh", "run.sh"]
