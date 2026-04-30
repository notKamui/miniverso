# syntax=docker/dockerfile:1.7
FROM node:24-slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV BUILD_ENV=production
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store vp run build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile --prod

FROM gcr.io/distroless/nodejs24-debian13:nonroot AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV BUILD_ENV=production

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/.drizzle ./.drizzle

EXPOSE 3000
CMD ["dist/serve.js"]
