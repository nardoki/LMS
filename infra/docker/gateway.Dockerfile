# =============================================================================
# MasteryLMS - API Gateway Service (NestJS)
# Multi-stage production build
# =============================================================================

# --- Stage 1: Build ---
FROM node:22-alpine AS builder

WORKDIR /app

# Install build tools for native modules if needed
RUN apk add --no-cache python3 make g++

COPY package*.json tsconfig*.json nest-cli.json ./
COPY libs ./libs
COPY apps/gateway ./apps/gateway

RUN npm ci

# Compile gateway and shared libraries
RUN npx nest build gateway

# Prune devDependencies for a lean production image
RUN npm prune --omit=dev

# --- Stage 2: Production Runner ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy runtime node_modules, proto contracts, and compiled dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/libs/proto ./libs/proto
COPY --from=builder /app/dist/apps/gateway ./dist/apps/gateway

# Run as non-root user for container security
USER node

EXPOSE 3000

CMD ["node", "dist/apps/gateway/main.js"]
