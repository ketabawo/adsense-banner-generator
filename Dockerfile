FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/build ./build
COPY scripts/migrate.mjs ./scripts/migrate.mjs
COPY migrations ./migrations
USER node
EXPOSE 3000
CMD ["node", "build"]
