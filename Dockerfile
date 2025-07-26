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

# ✅ Create start.sh in /app and make sure it's executable
RUN echo -e '#!/bin/sh\nnpx prisma migrate deploy\nnpm run docker-start' > /app/start.sh && chmod +x /app/start.sh

# ✅ Use absolute path to avoid path issues
CMD ["/app/start.sh"]
