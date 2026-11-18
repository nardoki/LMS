# =============================================================================
# MasteryLMS - Complete Backend Container (Gateway + All 4 Microservices)
# Optimized for 1-Click Deployment on Render, Railway, or VPS Free Tier
# =============================================================================

# --- Stage 1: Build ---
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json tsconfig*.json nest-cli.json ./
COPY libs ./libs
COPY apps ./apps

RUN npm ci

# Compile all microservices (gateway, course, assessment, mastery, notification)
RUN npm run build

# Prune devDependencies to keep container tiny
RUN npm prune --omit=dev

# --- Stage 2: Production Runner ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install lightweight Redis server (~5MB) for BullMQ & cache in single-container mode
RUN apk add --no-cache redis

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/libs/proto ./libs/proto
COPY --from=builder /app/dist ./dist
COPY infra/scripts/start-all.js ./start-all.js

EXPOSE 3000

CMD ["node", "start-all.js"]
