FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src
COPY sql ./sql

EXPOSE 4000
CMD ["sh", "-c", "node src/migrate.js && node src/index.js"]
