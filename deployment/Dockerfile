FROM oven/bun:1-alpine
WORKDIR /app

ENV NODE_ENV=production
COPY ./public ./public
COPY ./dist ./dist
COPY ./.drizzle ./.drizzle
COPY serve.ts .

EXPOSE 3000
CMD ["bun", "serve.ts"]
