FROM node:18-alpine

RUN apk add --no-cache openssl bash

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

RUN npm remove @shopify/cli

COPY . .

RUN npm run build

EXPOSE 3000

# Create a startup script to run migrations before starting app
RUN echo '#!/bin/sh\nnpx prisma migrate deploy\nnpm run docker-start' > start.sh && chmod +x start.sh

CMD ["./start.sh"]
