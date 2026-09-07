# ====================================================================
# CENTIPEDE OS — PRODUCTION MULTI-STAGE DOCKERFILE
# ====================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json bun.lock tsconfig.json vite.config.ts ./

# Install dependencies
RUN npm install

# Copy source files
COPY index.html ./
COPY src/ ./src/

# Build production bundle
RUN npm run build

# --- STAGE 2: PRODUCTION RUNTIME ---
FROM node:20-alpine AS runner

WORKDIR /app

# Security directive: Run as non-root user
RUN addgroup -g 1001 centipede && \
    adduser -u 1001 -G centipede -s /bin/sh -D centipede

# Install lightweight web server for static SPA serving
RUN npm install -g serve

# Copy built dist artifacts from builder stage
COPY --from=builder /app/dist /app/dist

# Set permissions
RUN chown -R centipede:centipede /app

USER centipede

ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

# Health Check Directive
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["serve", "-s", "dist", "-l", "3000"]
