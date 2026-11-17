# =============================================================================
# MasteryLMS - Course Microservice (gRPC)
# Multi-stage production build
# =============================================================================

# --- Stage 1: Build ---
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json tsconfig*.json nest-cli.json ./
COPY libs ./libs
COPY apps/course-svc ./apps/course-svc

RUN npm ci

# Compile course-svc
RUN npx nest build course-svc

# Prune devDependencies
RUN npm prune --omit=dev

# --- Stage 2: Production Runner ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV COURSE_SERVICE_TARGET=0.0.0.0:50051

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/libs/proto ./libs/proto
COPY --from=builder /app/dist/apps/course-svc ./dist/apps/course-svc

USER node

EXPOSE 50051

CMD ["node", "dist/apps/course-svc/main.js"]
