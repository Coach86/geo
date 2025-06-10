FROM node:20-slim AS builder

# Install Python and build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    build-essential \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

RUN npm i -g @nestjs/cli

WORKDIR /app

COPY package*.json ./

# Install dependencies with platform-specific builds
RUN npm ci --ignore-scripts

COPY . .

# Rebuild all native modules including nested dependencies
RUN npm rebuild --verbose

RUN npm run build

FROM node:20-slim

# Install wget for downloading SSL certificates and libraries required by sharp
RUN apt-get update && apt-get install -y \
    wget \
    libvips42 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app


COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config.json ./
COPY --from=builder /app/public ./public

# Copy SSL certificate for RDS
RUN wget https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

EXPOSE 3000

CMD ["node", "dist/main.js"]
