# Multi-stage build for API
FROM public.ecr.aws/docker/library/node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files for all workspaces
COPY package.json package-lock.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/database/package*.json ./packages/database/

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
RUN npm run build --workspace=@watchagent/database

# Build API
RUN npm run build --workspace=@watchagent/api

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiuser

# Copy built application
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/entrypoint.sh ./apps/api/entrypoint.sh
COPY --from=builder --chown=apiuser:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=apiuser:nodejs /app/packages/database/dist ./packages/database/dist
COPY --from=builder --chown=apiuser:nodejs /app/packages/database/migrations ./packages/database/migrations

# Copy node_modules (production only)
COPY --from=builder --chown=apiuser:nodejs /app/node_modules ./node_modules

# Copy package.json files
COPY --from=builder --chown=apiuser:nodejs /app/package*.json ./
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/package*.json ./apps/api/
COPY --from=builder --chown=apiuser:nodejs /app/packages/shared/package*.json ./packages/shared/
COPY --from=builder --chown=apiuser:nodejs /app/packages/database/package*.json ./packages/database/

# Make entrypoint executable
RUN chmod +x /app/apps/api/entrypoint.sh

USER apiuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application with migrations
CMD ["/bin/sh", "/app/apps/api/entrypoint.sh"]
