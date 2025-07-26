FROM node:18-alpine

# Install necessary packages
RUN apk add --no-cache openssl bash

WORKDIR /app

ENV NODE_ENV=production

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Optional: Remove unnecessary CLI
RUN npm remove @shopify/cli

# Copy app source
COPY . .

# Build project
RUN npm run build

# Port app will run on
EXPOSE 3000

# Create a startup script to run Prisma migration and start app
RUN echo '#!/bin/sh\nnpx prisma migrate deploy\nnpm run docker-start' > start.sh && chmod +x start.sh

CMD ["./start.sh"]
