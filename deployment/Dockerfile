FROM node:25-alpine AS base
WORKDIR /app
ENV NODE_ENV=production
ENV BUILD_ENV=production

FROM base AS install

RUN mkdir -p /tmp/build
COPY package.json /tmp/build/
RUN cd /tmp/build && npm install

RUN mkdir -p /tmp/prod
COPY package.json /tmp/prod/
RUN cd /tmp/prod && npm install --omit=dev

FROM base AS build

COPY --from=install /tmp/build/node_modules node_modules
COPY . .

ENV NODE_ENV=production
ENV BUILD_ENV=production
RUN npm run build

FROM base AS production

COPY --from=install /tmp/prod/node_modules node_modules
COPY --from=build /app/public ./public
COPY --from=build /app/dist ./dist
COPY --from=build /app/.drizzle ./.drizzle

USER node
EXPOSE 3000
CMD ["node", "dist/serve.js"]
