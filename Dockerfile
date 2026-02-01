# ---- Dependencies stage ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production

# ---- Builder stage ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
# build only, skip tsc typecheck for speed
RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY server.cjs .
EXPOSE 3000
CMD ["node","server.cjs"]
