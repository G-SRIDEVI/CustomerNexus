# ─────────────────────────────────────────────────────────────
# Stage 1: Build Stage – Install all dependencies
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first (leverages Docker layer caching)
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# ─────────────────────────────────────────────────────────────
# Stage 2: Production Stage – Lean final image
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Create a non-root user for security
RUN addgroup -S shopsense && adduser -S shopsense -G shopsense

WORKDIR /app

# Copy installed node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY . .

# Change ownership to non-root user
RUN chown -R shopsense:shopsense /app

USER shopsense

# Expose Express port
EXPOSE 5000

# Health check – verifies the API is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/products || exit 1

# Start the Express server
CMD ["node", "server.js"]
