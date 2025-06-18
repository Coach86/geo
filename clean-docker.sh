#!/bin/bash

echo "Stopping all containers..."
docker-compose -f docker-compose.dev.yml down

echo "Removing all stopped containers..."
docker container prune -f

echo "Removing all unused images..."
docker image prune -a -f

echo "Removing all unused volumes..."
docker volume prune -f

echo "Removing all build cache..."
docker builder prune -a -f

echo "Docker cleanup complete!"
echo ""
echo "To rebuild and start fresh, run:"
echo "docker-compose -f docker-compose.dev.yml up --build"