FROM node:18-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:18-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

CMD ["node", "backend/server.js"]
