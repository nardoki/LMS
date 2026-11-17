# =============================================================================
# MasteryLMS - Spaced Repetition & Notification Microservice (BullMQ + Redis)
# Multi-stage production build
# =============================================================================

# --- Stage 1: Build ---
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json tsconfig*.json nest-cli.json ./
COPY libs ./libs
COPY apps/notification-svc ./apps/notification-svc

RUN npm ci

# Compile notification-svc
RUN npx nest build notification-svc

# Prune devDependencies
RUN npm prune --omit=dev

# --- Stage 2: Production Runner ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NOTIFICATION_SERVICE_TARGET=0.0.0.0:50054

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/libs/proto ./libs/proto
COPY --from=builder /app/dist/apps/notification-svc ./dist/apps/notification-svc

USER node

EXPOSE 50054

CMD ["node", "dist/apps/notification-svc/main.js"]
