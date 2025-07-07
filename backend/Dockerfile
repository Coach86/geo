# Base stage with common OS layer
FROM node:20-alpine AS base

# Stage 1: Install dependencies
FROM base AS dependencies
WORKDIR /app
COPY package*.json ./
COPY .npmrc ./
RUN npm ci

# Stage 2: Build application
FROM base AS builder
WORKDIR /app
COPY package*.json ./
COPY .npmrc ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN npm run build

# Stage 3: Production dependencies only
FROM base AS prod-dependencies
WORKDIR /app
COPY package*.json ./
COPY .npmrc ./
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 4: Final runtime
FROM base AS runtime
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy only production dependencies and built application
COPY --from=prod-dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/public ./public
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs config.json ./

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && chown nodejs:nodejs /app/logs

# Download SSL certificate for RDS
RUN wget -O /app/global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem && \
    chown nodejs:nodejs /app/global-bundle.pem

USER nodejs

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
