#!/bin/bash

echo "Creating Docker network..."
docker network create geo-network || true

echo "Starting PostgreSQL container..."
docker run --name postgres-geo \
  --network geo-network \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=brand_insights \
  -p 5433:5432 \
  -d postgres:14

echo "Waiting for PostgreSQL to start..."
sleep 5

echo "PostgreSQL is now running!"
echo "Connection string: postgresql://postgres:postgres@localhost:5433/brand_insights?schema=public"