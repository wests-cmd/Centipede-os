# ====================================================================
# CENTIPEDE OS — PRODUCTION MULTI-STAGE DOCKERFILE
# ====================================================================
FROM oven/bun:1.4.2-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json bun.lock tsconfig.json vite.config.ts postcss.config.js tailwind.config.js ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY index.html ./
COPY src/ ./src/

# Build production bundle
RUN bun run build

# --- STAGE 2: PRODUCTION WEB + API RUNTIME ---
FROM oven/bun:1.4.2-alpine AS runner

WORKDIR /app

# Security directive: Run as non-root user
RUN addgroup -g 1001 centipede && \
    adduser -u 1001 -G centipede -s /bin/sh -D centipede

# The same-origin server handles the SPA and the shared mobile pairing API.
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/src /app/src
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json

# Set permissions
RUN chown -R centipede:centipede /app

USER centipede

ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

# Health Check Directive
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD bun -e "await fetch('http://127.0.0.1:3000/api/v1/health').then(r=>{if(!r.ok)process.exit(1)})"

CMD ["bun", "run", "src/server/production.ts"]
