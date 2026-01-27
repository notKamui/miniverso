FROM oven/bun:1-alpine AS base
WORKDIR /app
ENV NODE_ENV=production
ENV BUILD_ENV=production

FROM base AS install

RUN mkdir -p /tmp/build
COPY package.json bun.lock /tmp/build/
RUN cd /tmp/build && bun install --frozen-lockfile

RUN mkdir -p /tmp/prod
COPY package.json bun.lock /tmp/prod/
RUN cd /tmp/prod && bun install --frozen-lockfile --production

FROM base AS build

COPY --from=install /tmp/build/node_modules node_modules
COPY . .

ENV NODE_ENV=production
ENV BUILD_ENV=production
RUN bun run build

FROM base AS production

COPY --from=install /tmp/prod/node_modules node_modules
COPY --from=build /app/public ./public
COPY --from=build /app/dist ./dist
COPY --from=build /app/.drizzle ./.drizzle
COPY --from=build /app/dist/serve.js ./

USER bun
EXPOSE 3000
CMD ["bun", "serve.js"]
