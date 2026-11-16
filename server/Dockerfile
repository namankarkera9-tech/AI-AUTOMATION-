# ==========================================
# Agentflow_AI Backend Service Dockerfile
# ==========================================
FROM node:20-alpine AS base

# Install curl for container health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts

# Copy application source code
COPY src ./src

# Default environment variables
ENV NODE_ENV=production \
    PORT=5001

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:5001/api/health || exit 1

CMD ["node", "src/index.js"]
