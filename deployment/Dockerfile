FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production
COPY ./public ./public
COPY ./.output ./.output
COPY ./.drizzle ./.drizzle

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
