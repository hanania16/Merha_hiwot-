FROM node:20-bullseye-slim AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm config set fetch-retries 5 && npm config set fetch-retry-mintimeout 20000 && npm config set fetch-retry-maxtimeout 120000 && npm install
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-bullseye-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY prisma ./prisma
COPY assets ./assets
COPY tsconfig.json ./
COPY src ./src
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/src/main"]
