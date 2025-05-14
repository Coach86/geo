FROM node:20-alpine AS builder

RUN npm i -g @nestjs/cli

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:20-alpine

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
