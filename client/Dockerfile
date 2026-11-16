# ==========================================
# Agentflow_AI Frontend Console Dockerfile
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install dependencies including devDependencies for build
RUN npm ci

# Copy configuration and source files
COPY next.config.js tailwind.config.js postcss.config.js jsconfig.json* ./
COPY src ./src

# Default build arguments for Next.js build-time public env
ARG NEXT_PUBLIC_API_URL=http://localhost:5001/api
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost:5001
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL} \
    NODE_ENV=production

# Build optimized production bundle
RUN npm run build

# ------------------------------------------
# Production Runner Stage
# ------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Install curl for health checking
RUN apk add --no-cache curl

# Copy build output, node_modules, and manifests from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:3000 || exit 1

CMD ["npm", "start"]
