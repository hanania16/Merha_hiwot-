FROM node:20-bullseye-slim AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
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
RUN npm install --include=dev
RUN npx prisma generate
COPY --from=builder /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/src/main"]
