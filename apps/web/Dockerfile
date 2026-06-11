# Multi-stage build for Next.js Web App
FROM public.ecr.aws/docker/library/node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files for all workspaces
COPY package.json package-lock.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/api-client/package*.json ./packages/api-client/
COPY packages/ui/package*.json ./packages/ui/

# Install all dependencies (npm workspaces installs everything in root node_modules)
RUN npm ci

# Build stage
FROM base AS builder
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source code
COPY . .

# Build shared packages first
RUN npm run build --workspace=@watchagent/shared
RUN npm run build --workspace=@watchagent/api-client
RUN npm run build --workspace=@watchagent/ui

# Build Next.js app
# Next.js collects anonymous telemetry data. Disable it.
ENV NEXT_TELEMETRY_DISABLED 1
# NEXT_PUBLIC_* vars are NOT baked in at build time — they are injected at
# container startup via entrypoint.sh → public/env.js → window.__NEXT_ENV__.
# This allows the same image to be deployed to any environment without a rebuild.

RUN npm run build --workspace=@watchagent/web

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./apps/web/.next
# public/ must be writable so entrypoint.sh can generate env.js at container start
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/entrypoint.sh ./apps/web/entrypoint.sh

# Copy package.json and node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/package*.json ./apps/web/
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy necessary package files for dependencies
COPY --from=builder --chown=nextjs:nodejs /app/packages/shared ./packages/shared
COPY --from=builder --chown=nextjs:nodejs /app/packages/api-client ./packages/api-client
COPY --from=builder --chown=nextjs:nodejs /app/packages/ui ./packages/ui

RUN chmod +x ./apps/web/entrypoint.sh

USER nextjs

# Expose port
EXPOSE 3001

ENV PORT 3001
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

WORKDIR /app
ENTRYPOINT ["./apps/web/entrypoint.sh"]
