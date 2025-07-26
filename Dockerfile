FROM node:18-alpine

<<<<<<< HEAD
RUN apk add --no-cache openssl bash
=======
EXPOSE 8080
>>>>>>> dcd326e5b7b0d7ae21b7a910d143c45ae001c067

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
