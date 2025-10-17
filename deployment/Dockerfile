FROM oven/bun:1-alpine
WORKDIR /app

ENV NODE_ENV=production
COPY ./public ./public
COPY ./dist ./dist
COPY ./.drizzle ./.drizzle
COPY ./node_modules ./node_modules
COPY dist/serve.js ./

EXPOSE 3000
CMD ["bun", "serve.js"]
