# =============================================================================
# MasteryLMS - Mastery & BKT Engine Microservice (gRPC)
# Multi-stage production build
# =============================================================================

# --- Stage 1: Build ---
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json tsconfig*.json nest-cli.json ./
COPY libs ./libs
COPY apps/mastery-svc ./apps/mastery-svc

RUN npm ci

# Compile mastery-svc
RUN npx nest build mastery-svc

# Prune devDependencies
RUN npm prune --omit=dev

# --- Stage 2: Production Runner ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV MASTERY_SERVICE_TARGET=0.0.0.0:50053

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/libs/proto ./libs/proto
COPY --from=builder /app/dist/apps/mastery-svc ./dist/apps/mastery-svc

USER node

EXPOSE 50053

CMD ["node", "dist/apps/mastery-svc/main.js"]
