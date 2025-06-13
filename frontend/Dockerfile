# Install dependencies only when needed
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=https://api.getmint.ai/api
ENV NEXT_PUBLIC_POSTHOG_KEY=phc_iNSRIwgW553mS6cI4rBvjMX0pisqkBeXGYvkm4kraft
ENV NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
RUN npm install -g pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Production image, copy all the files and run next
FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm

ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=https://api.getmint.ai/api

# Copy only the necessary files for production
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

# Start the Next.js server
CMD ["pnpm", "start"]
