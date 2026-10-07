# syntax=docker/dockerfile:1

# --- build stage: the official Vite+ toolchain image ---
FROM ghcr.io/voidzero-dev/vite-plus:latest AS build
WORKDIR /app

# Install dependencies first so this layer is cached across source changes.
COPY --chown=vp:vp package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version* ./
RUN vp install --frozen-lockfile

# vp reads .node-version and provisions that exact Node.js automatically.
COPY --chown=vp:vp . .
ENV NODE_ENV=production
ENV BUILD_ENV=production
RUN vp run build

# Export the exact resolved Node.js binary for the runtime stage.
# The official Node build also needs libatomic, which distroless/cc does not ship.
RUN cp "$(vp env which node | head -1)" /tmp/node \
  && cp -L /usr/lib/*/libatomic.so.1 /tmp/libatomic.so.1

# --- deps stage: production-only dependencies ---
# A separate, fresh --prod install so devDependencies (including the vite-plus
# toolchain) are excluded. Running --prod over the full install above would not
# prune the already-installed devDependencies.
FROM ghcr.io/voidzero-dev/vite-plus:latest AS deps
WORKDIR /app
COPY --chown=vp:vp package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version* ./
RUN vp install --frozen-lockfile --prod

# --- runtime stage: distroless cc, no vp ---
# glibc-based so the copied Node.js binary stays compatible, and smaller than
# the nodejs distroless image. nonroot matches the previous runtime user.
FROM gcr.io/distroless/cc-debian13:nonroot AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV BUILD_ENV=production

COPY --from=build /tmp/node /usr/local/bin/node
COPY --from=build /tmp/libatomic.so.1 /usr/local/lib/libatomic.so.1
ENV LD_LIBRARY_PATH=/usr/local/lib
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/.drizzle ./.drizzle
COPY --from=build /app/package.json ./

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/node"]
CMD ["dist/serve.js"]
