# ---- Base ----
FROM node:22-alpine AS base
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# ---- Stage 1: Dependencies ----
FROM base AS deps

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# ---- Stage 2: Build ----
FROM deps AS builder

COPY . .

# Generate Prisma client for build-time types
RUN npx prisma generate

# Build Next.js standalone output
RUN npm run build

# ---- Stage 3: Production dependencies ----
FROM deps AS prod-deps

COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

RUN npx prisma generate \
  && npm prune --omit=dev \
  && npm cache clean --force

# ---- Stage 4: Production runtime ----
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3456
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build (includes auto-traced node_modules)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma files for migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/scripts ./scripts

# Copy only production node_modules with generated Prisma client
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/start.sh ./start.sh

# Set ownership
RUN sed -i 's/\r$//' /app/start.sh && \
    chmod +x /app/start.sh && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3456

CMD ["./start.sh"]
