# =============================================================================
# MasteryLMS - Assessment Microservice (gRPC)
# Multi-stage production build
# =============================================================================

# --- Stage 1: Build ---
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json tsconfig*.json nest-cli.json ./
COPY libs ./libs
COPY apps/assessment-svc ./apps/assessment-svc

RUN npm ci

# Compile assessment-svc
RUN npx nest build assessment-svc

# Prune devDependencies
RUN npm prune --omit=dev

# --- Stage 2: Production Runner ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV ASSESSMENT_SERVICE_TARGET=0.0.0.0:50052

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/libs/proto ./libs/proto
COPY --from=builder /app/dist/apps/assessment-svc ./dist/apps/assessment-svc

USER node

EXPOSE 50052

CMD ["node", "dist/apps/assessment-svc/main.js"]
